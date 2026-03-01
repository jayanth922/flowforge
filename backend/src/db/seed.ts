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
    name: "Payment Retry Flow",
    description:
      "Retries failed payments, notifies the account owner, and flags for review",
    prompt:
      "When a payment fails, retry 3 times at 1-hour intervals, then notify the account owner via email and flag the transaction for review",
    nodes: [
      { id: "node_1", type: "trigger", label: "Payment Failed", config: { triggerType: "webhook" }, position: { x: 0, y: 0 } },
      { id: "node_2", type: "http_request", label: "Retry Payment", config: { method: "POST", url: "https://api.example.com/payments/retry", body: "{\"paymentId\": \"{{payload.payment_id}}\"}" }, position: { x: 250, y: 0 } },
      { id: "node_3", type: "delay", label: "Wait 1 Hour", config: { duration: 1, unit: "hours" }, position: { x: 500, y: 0 } },
      { id: "node_4", type: "send_email", label: "Notify Owner", config: { to: "{{payload.owner_email}}", subject: "Payment Failed", body: "Your payment of ${{payload.amount}} has failed." }, position: { x: 750, y: 0 } },
      { id: "node_5", type: "http_request", label: "Flag for Review", config: { method: "PATCH", url: "https://api.example.com/transactions/{{payload.transaction_id}}", body: "{\"status\": \"flagged\"}" }, position: { x: 1000, y: 0 } },
    ],
    edges: [
      { id: "edge_1", source: "node_1", target: "node_2", label: "on failure" },
      { id: "edge_2", source: "node_2", target: "node_3", label: "still failing" },
      { id: "edge_3", source: "node_3", target: "node_4", label: "after delay" },
      { id: "edge_4", source: "node_4", target: "node_5", label: "then" },
    ],
  },
  {
    name: "User Onboarding Flow",
    description:
      "Sends welcome email, waits, sends checklist, escalates if incomplete",
    prompt:
      "When a new user registers, send a welcome email, wait 24 hours, then send an onboarding checklist, if not completed in 3 days escalate to support team",
    nodes: [
      { id: "node_1", type: "trigger", label: "User Registered", config: { triggerType: "webhook" }, position: { x: 0, y: 0 } },
      { id: "node_2", type: "send_email", label: "Send Welcome Email", config: { to: "{{payload.email}}", subject: "Welcome to FlowForge!", body: "Hello {{payload.name}}, welcome aboard!" }, position: { x: 250, y: 0 } },
      { id: "node_3", type: "delay", label: "Wait 24 Hours", config: { duration: 24, unit: "hours" }, position: { x: 500, y: 0 } },
      { id: "node_4", type: "send_email", label: "Send Checklist", config: { to: "{{payload.email}}", subject: "Your Onboarding Checklist", body: "Complete your onboarding steps." }, position: { x: 750, y: 0 } },
      { id: "node_5", type: "condition", label: "Completed?", config: { expression: "{{steps.node_4.output.success}} == true" }, position: { x: 1000, y: 0 } },
      { id: "node_6", type: "post_slack", label: "Escalate to Support", config: { webhookUrl: "{{env.SLACK_WEBHOOK_URL}}", message: "User {{payload.email}} has not completed onboarding." }, position: { x: 1250, y: 0 } },
    ],
    edges: [
      { id: "edge_1", source: "node_1", target: "node_2", label: "then" },
      { id: "edge_2", source: "node_2", target: "node_3", label: "sent" },
      { id: "edge_3", source: "node_3", target: "node_4", label: "after delay" },
      { id: "edge_4", source: "node_4", target: "node_5", label: "then" },
      { id: "edge_5", source: "node_5", target: "node_6", label: "not completed" },
    ],
  },
  {
    name: "Invoice Processing Flow",
    description:
      "Extracts line items, matches purchase orders, flags discrepancies, notifies approver",
    prompt:
      "When an invoice is uploaded, extract line items, match against open purchase orders, flag discrepancies over 5%, and notify the assigned approver",
    nodes: [
      { id: "node_1", type: "trigger", label: "Invoice Uploaded", config: { triggerType: "webhook" }, position: { x: 0, y: 0 } },
      { id: "node_2", type: "http_request", label: "Extract Line Items", config: { method: "POST", url: "https://api.example.com/invoices/extract", body: "{\"invoiceId\": \"{{payload.invoice_id}}\"}", extractPath: "data.lineItems" }, position: { x: 250, y: 0 } },
      { id: "node_3", type: "http_request", label: "Match Purchase Orders", config: { method: "POST", url: "https://api.example.com/po/match", body: "{\"lineItems\": {{steps.node_2.output.extracted}}}" }, position: { x: 500, y: 0 } },
      { id: "node_4", type: "condition", label: "Discrepancy > 5%?", config: { expression: "{{steps.node_3.output.extracted}} > 5" }, position: { x: 750, y: 0 } },
      { id: "node_5", type: "create_github_issue", label: "Flag Discrepancy", config: { owner: "your-org", repo: "invoices", title: "Discrepancy on invoice {{payload.invoice_id}}", body: "Discrepancy exceeds 5% threshold.", labels: ["billing"] }, position: { x: 1000, y: 0 } },
      { id: "node_6", type: "send_email", label: "Notify Approver", config: { to: "{{payload.approver_email}}", subject: "Invoice Review Required", body: "Invoice {{payload.invoice_id}} needs your attention." }, position: { x: 1250, y: 0 } },
    ],
    edges: [
      { id: "edge_1", source: "node_1", target: "node_2", label: "then" },
      { id: "edge_2", source: "node_2", target: "node_3", label: "extracted" },
      { id: "edge_3", source: "node_3", target: "node_4", label: "matched" },
      { id: "edge_4", source: "node_4", target: "node_5", label: "if true" },
      { id: "edge_5", source: "node_5", target: "node_6", label: "then" },
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
      return { result: true, evaluated: node.label };
    case "delay":
      return { waited: true, duration: "2s (capped for demo)" };
    case "notification": {
      const recipient =
        typeof node.config["to"] === "string" ? node.config["to"] : "admin";
      return { notified: true, recipient };
    }
    case "send_email":
      return { success: true, messageId: "seed_msg_001", to: node.config["to"], subject: node.config["subject"] };
    case "post_slack":
      return { success: true, message: node.config["message"] };
    case "post_discord":
      return { success: true, message: node.config["message"] };
    case "create_github_issue":
      return { success: true, issueNumber: 42, issueUrl: "https://github.com/example/issues/42" };
    case "http_request":
      return { success: true, status: 200, response: {} };
    case "data_transform":
      return { extracted: "sample_value" };
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
