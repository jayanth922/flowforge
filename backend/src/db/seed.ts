import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { pool, query } from "./postgres.js";
import { logger } from "../utils/logger.js";
import {
  WorkflowDAGModel,
  ExecutionLogModel,
  type IDAGNode,
  type IDAGEdge,
} from "../models/workflow.model.js";

const DEMO_EMAIL = "demo@flowforge.com";
const DEMO_PASSWORD = "Demo1234!";
const DEMO_TENANT_NAME = "FlowForge Demo";

interface SeedWorkflowDef {
  name: string;
  description: string;
  prompt: string;
  nodes: IDAGNode[];
  edges: IDAGEdge[];
}

const WORKFLOWS: SeedWorkflowDef[] = [
  {
    name: "Payment Alert Pipeline",
    description:
      "Checks payment amount, alerts Slack, creates GitHub issue for fraud review, and emails the customer",
    prompt:
      "When a payment fails, check if amount > $500, alert Slack, create GitHub issue for fraud review, then email the customer",
    nodes: [
      { id: "node_1", type: "trigger", label: "Payment Failed", config: { triggerType: "webhook" }, position: { x: 0, y: 0 } },
      { id: "node_2", type: "condition", label: "High Value?", config: { expression: "{{payload.amount}} > 500" }, position: { x: 250, y: 0 } },
      { id: "node_3", type: "post_slack", label: "Alert Slack", config: { webhookUrl: "{{env.DEMO_SLACK_WEBHOOK}}", message: "\u{1F6A8} High-value payment failed!\nAmount: ${{payload.amount}}\nCustomer: {{payload.customer_name}}\nTransaction: {{payload.transaction_id}}" }, position: { x: 500, y: 0 } },
      { id: "node_4", type: "create_github_issue", label: "Create Review Issue", config: { owner: "{{env.GITHUB_OWNER}}", repo: "{{env.GITHUB_DEMO_REPO}}", title: "Fraud Review: TXN-{{payload.transaction_id}}", body: "Amount: ${{payload.amount}}\nCustomer: {{payload.customer_email}}\nRequires manual review.", labels: ["fraud-review", "high-priority"] }, position: { x: 750, y: 0 } },
      { id: "node_5", type: "send_email", label: "Notify Customer", config: { to: "{{payload.customer_email}}", subject: "Action Required: Payment of ${{payload.amount}} failed", body: "Dear {{payload.customer_name}},\n\nYour payment of ${{payload.amount}} on {{payload.date}} could not be processed.\n\nPlease update your payment method.\n\nFlowForge Payments Team" }, position: { x: 1000, y: 0 } },
    ],
    edges: [
      { id: "edge_1", source: "node_1", target: "node_2", label: "then" },
      { id: "edge_2", source: "node_2", target: "node_3", label: "if true" },
      { id: "edge_3", source: "node_3", target: "node_4", label: "then" },
      { id: "edge_4", source: "node_4", target: "node_5", label: "then" },
    ],
  },
  {
    name: "Daily Tech Digest",
    description:
      "Fetches posts from an API on a daily schedule, formats a digest, and posts it to Discord",
    prompt:
      "Every day at 9am, fetch latest posts from an API, format them into a digest, and post to Discord",
    nodes: [
      { id: "node_1", type: "trigger", label: "Daily 9am", config: { triggerType: "schedule", cronExpression: "0 9 * * *" }, position: { x: 0, y: 0 } },
      { id: "node_2", type: "http_request", label: "Fetch Posts", config: { method: "GET", url: "https://jsonplaceholder.typicode.com/posts?_limit=3", extractPath: "data" }, position: { x: 250, y: 0 } },
      { id: "node_3", type: "data_transform", label: "Format Digest", config: { extractPath: "steps.node_2.output", outputKey: "digest" }, position: { x: 500, y: 0 } },
      { id: "node_4", type: "post_discord", label: "Post to Discord", config: { webhookUrl: "{{env.DEMO_DISCORD_WEBHOOK}}", message: "\u{1F4F0} Daily Tech Digest\n\nFetched {{steps.node_3.output.digest}} items from API" }, position: { x: 750, y: 0 } },
    ],
    edges: [
      { id: "edge_1", source: "node_1", target: "node_2", label: "at 9am daily" },
      { id: "edge_2", source: "node_2", target: "node_3", label: "fetched" },
      { id: "edge_3", source: "node_3", target: "node_4", label: "formatted" },
    ],
  },
  {
    name: "User Onboarding Flow",
    description:
      "Sends a welcome email to new users, waits briefly, then creates a GitHub issue to track the signup",
    prompt:
      "When a new user signs up, send a welcome email, wait briefly, then create a GitHub issue to track the new user",
    nodes: [
      { id: "node_1", type: "trigger", label: "User Signed Up", config: { triggerType: "webhook" }, position: { x: 0, y: 0 } },
      { id: "node_2", type: "send_email", label: "Welcome Email", config: { to: "{{payload.user_email}}", subject: "Welcome to FlowForge, {{payload.user_name}}!", body: "Hi {{payload.user_name}},\n\nWelcome! Your {{payload.plan}} plan is now active.\n\nGet started at https://flowforge-tau.vercel.app\n\nThe FlowForge Team" }, position: { x: 250, y: 0 } },
      { id: "node_3", type: "delay", label: "Wait 2 Seconds", config: { duration: 2, unit: "seconds" }, position: { x: 500, y: 0 } },
      { id: "node_4", type: "create_github_issue", label: "Log New User", config: { owner: "{{env.GITHUB_OWNER}}", repo: "{{env.GITHUB_DEMO_REPO}}", title: "New {{payload.plan}} user: {{payload.user_name}}", body: "Email: {{payload.user_email}}\nPlan: {{payload.plan}}\nSigned up: {{payload.signup_date}}", labels: ["new-user", "{{payload.plan}}"] }, position: { x: 750, y: 0 } },
    ],
    edges: [
      { id: "edge_1", source: "node_1", target: "node_2", label: "then" },
      { id: "edge_2", source: "node_2", target: "node_3", label: "sent" },
      { id: "edge_3", source: "node_3", target: "node_4", label: "after delay" },
    ],
  },
];

const NODE_DURATIONS: Record<string, number> = {
  trigger: 100,
  condition: 50,
  delay: 2000,
  notification: 1000,
  send_email: 1200,
  post_slack: 800,
  post_discord: 800,
  create_github_issue: 1500,
  http_request: 1500,
  data_transform: 50,
};

const mockOutput = (node: IDAGNode): Record<string, unknown> => {
  switch (node.type) {
    case "trigger":
      return { event: "trigger_fired", payload: {} };
    case "condition":
      return { result: true, expression: "750 > 500", evaluated: true };
    case "delay":
      return { waited: true, duration: "2000ms (capped for demo)" };
    case "notification": {
      const recipient =
        typeof node.config["to"] === "string" ? node.config["to"] : "admin";
      return { notified: true, recipient };
    }
    case "send_email":
      return { success: true, messageId: "seed_msg_" + node.id, to: String(node.config["to"] ?? ""), subject: String(node.config["subject"] ?? "") };
    case "post_slack":
      return { success: true, message: String(node.config["message"] ?? "") };
    case "post_discord":
      return { success: true, message: String(node.config["message"] ?? "") };
    case "create_github_issue":
      return { success: true, issueNumber: 42, issueUrl: "https://github.com/example/issues/42" };
    case "http_request":
      return { success: true, status: 200, response: { data: [{ id: 1, title: "Sample Post" }] }, extracted: [{ id: 1, title: "Sample Post" }] };
    case "data_transform":
      return { digest: 3 };
  }
};

const seedWorkflow = async (
  def: SeedWorkflowDef,
  tenantId: string,
  userId: string,
  baseTime: Date,
): Promise<void> => {
  const wfResult = await query(
    `INSERT INTO workflows (tenant_id, created_by, name, description, status)
     VALUES ($1, $2, $3, $4, 'active')
     RETURNING *`,
    [tenantId, userId, def.name, def.description],
  );
  const workflowId = (wfResult.rows[0] as { id: string }).id;

  await WorkflowDAGModel.create({
    workflowId,
    tenantId,
    version: 1,
    naturalLanguagePrompt: def.prompt,
    dag: { nodes: def.nodes, edges: def.edges },
    compiledAt: baseTime,
    compiledBy: userId,
  });

  const execResult = await query(
    `INSERT INTO workflow_executions
       (workflow_id, tenant_id, triggered_by, trigger_payload, status, started_at, completed_at)
     VALUES ($1, $2, $3, '{}', 'completed', $4, $5)
     RETURNING *`,
    [workflowId, tenantId, userId, baseTime, new Date(baseTime.getTime() + def.nodes.length * 2500)],
  );
  const executionId = (execResult.rows[0] as { id: string }).id;

  const logs = def.nodes.map((node, i) => {
    const startedAt = new Date(baseTime.getTime() + i * 2500);
    const duration = NODE_DURATIONS[node.type] ?? 1000;
    const completedAt = new Date(startedAt.getTime() + duration);

    return {
      executionId,
      workflowId,
      tenantId,
      stepId: node.id,
      stepLabel: node.label,
      status: "completed" as const,
      startedAt,
      completedAt,
      input: {},
      output: mockOutput(node),
      retryCount: 0,
    };
  });

  await ExecutionLogModel.insertMany(logs);

  logger.info({ workflow: def.name, nodes: def.nodes.length }, "seeded workflow");
};

export const seedIfEmpty = async (): Promise<void> => {
  const existing = await query(
    "SELECT id FROM users WHERE email = $1",
    [DEMO_EMAIL],
  );

  if (existing.rows.length > 0) {
    logger.info("seed already applied, skipping");
    return;
  }

  const tenantResult = await query(
    "INSERT INTO tenants (name) VALUES ($1) RETURNING *",
    [DEMO_TENANT_NAME],
  );
  const tenantId = (tenantResult.rows[0] as { id: string }).id;

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const userResult = await query(
    `INSERT INTO users (tenant_id, email, password_hash, role)
     VALUES ($1, $2, $3, 'admin')
     RETURNING *`,
    [tenantId, DEMO_EMAIL, passwordHash],
  );
  const userId = (userResult.rows[0] as { id: string }).id;

  logger.info("created demo tenant and user");

  const baseTime = new Date(Date.now() - 3600_000);

  for (const def of WORKFLOWS) {
    await seedWorkflow(def, tenantId, userId, baseTime);
  }

  logger.info("seed complete");
};

const isDirectRun =
  process.argv[1] &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isDirectRun) {
  const mongoUri = process.env["MONGODB_URI"];
  if (!mongoUri) throw new Error("MONGODB_URI is not set");

  mongoose
    .connect(mongoUri)
    .then(() => seedIfEmpty())
    .then(() => mongoose.disconnect())
    .then(() => pool.end())
    .catch((err) => {
      logger.fatal({ err }, "seed failed");
      process.exit(1);
    });
}
