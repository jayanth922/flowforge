import Groq from "groq-sdk";
import {
  workflowDAGResponseSchema,
  type WorkflowDAGResponse,
} from "./dagSchema.js";

const SYSTEM_PROMPT = `You are a workflow DAG compiler for FlowForge. Convert natural language business process descriptions into structured workflow DAGs.

Output ONLY a valid JSON object with this structure:
{
  "nodes": [{ "id": "node_1", "type": "trigger|action|condition|delay|notification", "label": "Short Label", "config": {}, "position": {"x": 0, "y": 0} }],
  "edges": [{ "id": "edge_1", "source": "node_1", "target": "node_2", "label": "optional label" }],
  "suggestedName": "Short Workflow Name",
  "description": "One-sentence description of what this workflow does"
}

Rules:
1. Every workflow MUST start with exactly one "trigger" node as the entry point.
2. Node types and when to use them:
   - trigger: The starting event (e.g., "Payment Failed", "Form Submitted")
   - action: Perform an operation (e.g., "Send Email", "Update Record", "Call API")
   - condition: If/else branching (e.g., "Check Status", "Retry Limit?")
   - delay: Wait for a time period. Set config to {"duration": number, "unit": "minutes"|"hours"|"days"}
   - notification: Alert a user or system (e.g., "Notify Admin", "Send Alert")
3. Position layout: left-to-right flow. Trigger at x:0, y:0. Each subsequent step +250 on x-axis. For parallel branches, offset y by +150 or -150.
4. Edge labels should describe the transition (e.g., "on failure", "if true", "if false", "then", "after delay").
5. Node labels MUST be concise: maximum 4 words.
6. Use sequential IDs: nodes as "node_1", "node_2", etc. Edges as "edge_1", "edge_2", etc.
7. The config object holds step-specific parameters. Examples: {"retries": 3, "interval": "1h"} for retries, {"to": "owner", "template": "payment_failed"} for emails, {"field": "status", "value": "flagged"} for record updates.
8. Do NOT output markdown, code fences, or explanatory text. Output ONLY the raw JSON object.`;

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
