import Groq from "groq-sdk";
import {
  workflowDAGResponseSchema,
  type WorkflowDAGResponse,
} from "./dagSchema.js";

const SYSTEM_PROMPT = `You are a workflow DAG compiler for FlowForge. Convert natural language business process descriptions into structured workflow DAGs with real integration configurations.

Output ONLY a valid JSON object with this structure:
{
  "nodes": [{ "id": "node_1", "type": "<nodeType>", "label": "Short Label", "config": {}, "position": {"x": 0, "y": 0} }],
  "edges": [{ "id": "edge_1", "source": "node_1", "target": "node_2", "label": "optional label" }],
  "suggestedName": "Short Workflow Name",
  "description": "One-sentence description of what this workflow does"
}

AVAILABLE NODE TYPES AND THEIR CONFIG:

1. trigger — the starting event (exactly one per workflow, always first)
   config: { "triggerType": "webhook" | "schedule" | "manual", "cronExpression": "optional cron string" }

2. send_email — send an email via Resend
   config: { "to": "recipient email or {{template}}", "subject": "subject line", "body": "HTML body content" }

3. post_slack — post a message to Slack channel
   config: { "webhookUrl": "{{env.SLACK_WEBHOOK_URL}}", "message": "message text", "username": "optional bot name" }

4. post_discord — post a message to Discord channel
   config: { "webhookUrl": "{{env.DISCORD_WEBHOOK_URL}}", "message": "message text", "username": "optional bot name" }

5. create_github_issue — create a GitHub issue
   config: { "owner": "repo-owner", "repo": "repo-name", "title": "issue title", "body": "issue body", "labels": ["bug"] }

6. http_request — make an HTTP API call
   config: { "method": "GET|POST|PUT|PATCH|DELETE", "url": "https://...", "headers": {}, "body": "optional JSON string", "extractPath": "data.result" }

7. condition — if/else branching
   config: { "expression": "{{payload.amount}} > 500" }

8. delay — wait for a time period (capped at 2s in demo)
   config: { "duration": 60, "unit": "seconds" | "minutes" | "hours" }

9. notification — generic alert/notification (prefer send_email or post_slack when possible)
   config: { "to": "recipient", "message": "alert text" }

10. data_transform — extract/reshape data between steps
    config: { "extractPath": "steps.node_3.output.data.id", "outputKey": "itemId" }

TEMPLATE VARIABLES:
- Use {{payload.fieldName}} to reference trigger payload fields.
- Use {{steps.node_X.output.fieldName}} to reference output from earlier nodes.
- Use {{value | default}} syntax for fallback defaults.
- All config string fields are rendered through a template engine at execution time.

EXAMPLES:
- Payment failure email node config:
  { "to": "{{payload.customer_email}}", "subject": "Payment of \${{payload.amount}} failed", "body": "Dear {{payload.customer_name}}, your payment of \${{payload.amount}} has failed." }
- API call followed by data extraction:
  http_request config: { "method": "GET", "url": "https://api.example.com/orders/{{payload.order_id}}", "extractPath": "data.status" }
  then condition config: { "expression": "{{steps.node_2.output.extracted}} == overdue" }

RULES:
1. Every workflow MUST start with exactly one "trigger" node.
2. Use SPECIFIC integration types (send_email, post_slack, http_request, etc.) — do NOT use a generic "action" type.
3. Position layout: left-to-right. Trigger at x:0, y:0. Each subsequent step +250 on x. Parallel branches offset y by ±150.
4. Edge labels describe transitions: "on failure", "if true", "if false", "then", "after delay".
5. Node labels: max 4 words, concise.
6. Sequential IDs: nodes as "node_1", "node_2"..., edges as "edge_1", "edge_2"...
7. Chain data correctly: later nodes reference earlier outputs via {{steps.node_X.output.field}}.
8. Output ONLY raw JSON. No markdown, no code fences, no explanations.`;

const MAX_RETRIES = 1;

const getClient = (): Groq => {
  const apiKey = process.env["GROQ_API_KEY"];
  if (!apiKey) throw new Error("GROQ_API_KEY environment variable is not set");
  return new Groq({ apiKey });
};

const createCompilerError = (message: string, cause?: unknown): Error => {
  const error = new Error(message);
  error.name = "CompilerError";
  if (cause) error.cause = cause;
  return error;
};

const callLLM = async (
  client: Groq,
  userPrompt: string,
): Promise<string> => {
  const response = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    temperature: 0.3,
    max_tokens: 2048,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw createCompilerError("LLM returned empty response");
  }

  return content;
};

export const compileWorkflow = async (
  prompt: string,
): Promise<WorkflowDAGResponse> => {
  const client = getClient();

  const rawJson = await callLLM(client, prompt);

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    throw createCompilerError("LLM returned invalid JSON");
  }

  const firstAttempt = workflowDAGResponseSchema.safeParse(parsed);
  if (firstAttempt.success) {
    return firstAttempt.data;
  }

  const errors = firstAttempt.error.errors
    .map((e) => `${e.path.join(".")}: ${e.message}`)
    .join("\n");

  for (let retry = 0; retry < MAX_RETRIES; retry++) {
    const correctionPrompt = `${prompt}\n\nYour previous output had these validation errors:\n${errors}\n\nFix these errors and output valid JSON.`;

    const retryJson = await callLLM(client, correctionPrompt);

    let retryParsed: unknown;
    try {
      retryParsed = JSON.parse(retryJson);
    } catch {
      continue;
    }

    const retryAttempt = workflowDAGResponseSchema.safeParse(retryParsed);
    if (retryAttempt.success) {
      return retryAttempt.data;
    }
  }

  throw createCompilerError(
    `Workflow compilation failed after ${MAX_RETRIES + 1} attempts. Validation errors:\n${errors}`,
  );
};
