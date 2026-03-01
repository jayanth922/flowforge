import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { compileWorkflow } from "../agents/llmCompiler.js";
import {
  createWorkflow,
  findWorkflowById,
  listWorkflowsByTenant,
  enableWebhook,
  disableWebhook,
} from "../models/workflowPg.model.js";
import { query as pgQuery } from "../db/postgres.js";
import { WorkflowDAGModel } from "../models/workflow.model.js";
import {
  registerWorkflowSchedule,
  unregisterWorkflowSchedule,
  validateCronExpression,
} from "../services/schedulerService.js";

export const workflowRouter = Router();

const compileSchema = z.object({
  prompt: z.string().min(10).max(500),
});

const cronQuerySchema = z.object({
  expr: z.string().min(1),
});

workflowRouter.use(requireAuth);

workflowRouter.get("/validate-cron", (req, res) => {
  const parsed = cronQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      error: "Missing or invalid expr query parameter",
      code: "VALIDATION_ERROR",
    });
    return;
  }

  const result = validateCronExpression(parsed.data.expr);
  res.status(200).json({ success: true, data: result });
});

workflowRouter.get("/stats", async (req, res, next) => {
  try {
    const { tenantId } = req.user!;

    const result = await pgQuery(
      `SELECT
         e.workflow_id,
         COUNT(*)::int AS total_executions,
         MAX(e.started_at) AS last_run_at,
         (SELECT e2.status FROM workflow_executions e2
          WHERE e2.workflow_id = e.workflow_id
          ORDER BY e2.started_at DESC LIMIT 1) AS last_status
       FROM workflow_executions e
       WHERE e.tenant_id = $1
       GROUP BY e.workflow_id`,
      [tenantId],
    );

    const stats: Record<
      string,
      { totalExecutions: number; lastRunAt: string | null; lastStatus: string | null }
    > = {};

    for (const row of result.rows as {
      workflow_id: string;
      total_executions: number;
      last_run_at: string | null;
      last_status: string | null;
    }[]) {
      stats[row.workflow_id] = {
        totalExecutions: row.total_executions,
        lastRunAt: row.last_run_at,
        lastStatus: row.last_status,
      };
    }

    res.status(200).json({ success: true, data: stats });
  } catch (err) {
    next(err);
  }
});

workflowRouter.post("/compile", async (req, res, next) => {
  try {
    const parsed = compileSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: parsed.error.errors.map((e) => e.message).join(", "),
        code: "VALIDATION_ERROR",
      });
      return;
    }

    const { prompt } = parsed.data;
    const { userId, tenantId } = req.user!;

    let dag;
    try {
      dag = await compileWorkflow(prompt);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Workflow compilation failed";
      res.status(502).json({
        success: false,
        error: message,
        code: "COMPILER_ERROR",
      });
      return;
    }

    const workflow = await createWorkflow(
      tenantId,
      userId,
      dag.suggestedName,
      dag.description,
    );

    await WorkflowDAGModel.create({
      workflowId: workflow.id,
      tenantId,
      version: 1,
      naturalLanguagePrompt: prompt,
      dag: {
        nodes: dag.nodes,
        edges: dag.edges,
      },
      compiledAt: new Date(),
      compiledBy: userId,
    });

    res.status(201).json({
      success: true,
      data: {
        workflowId: workflow.id,
        dag,
      },
    });
  } catch (err) {
    next(err);
  }
});

workflowRouter.get("/", async (req, res, next) => {
  try {
    const { tenantId } = req.user!;
    const workflows = await listWorkflowsByTenant(tenantId);

    res.status(200).json({
      success: true,
      data: workflows,
    });
  } catch (err) {
    next(err);
  }
});

workflowRouter.get("/:id/dag", async (req, res, next) => {
  try {
    const { tenantId } = req.user!;
    const { id } = req.params;

    const workflow = await findWorkflowById(id, tenantId);
    if (!workflow) {
      res.status(404).json({
        success: false,
        error: "Workflow not found",
        code: "WORKFLOW_NOT_FOUND",
      });
      return;
    }

    const dag = await WorkflowDAGModel.findOne({
      workflowId: id,
      tenantId,
    }).sort({ version: -1 });

    if (!dag) {
      res.status(404).json({
        success: false,
        error: "No compiled DAG found for this workflow",
        code: "DAG_NOT_FOUND",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: dag,
    });
  } catch (err) {
    next(err);
  }
});

workflowRouter.get("/:id/webhook", async (req, res, next) => {
  try {
    const { tenantId } = req.user!;
    const { id } = req.params;

    const workflow = await findWorkflowById(id, tenantId);
    if (!workflow) {
      res.status(404).json({
        success: false,
        error: "Workflow not found",
        code: "WORKFLOW_NOT_FOUND",
      });
      return;
    }

    const baseUrl = process.env["BASE_URL"] ?? "http://localhost:3001";
    const webhookUrl = workflow.webhook_secret
      ? `${baseUrl}/api/v1/webhooks/trigger/${workflow.webhook_secret}`
      : null;

    res.status(200).json({
      success: true,
      data: {
        webhookEnabled: workflow.webhook_enabled,
        webhookUrl,
      },
    });
  } catch (err) {
    next(err);
  }
});

workflowRouter.post("/:id/webhook/enable", async (req, res, next) => {
  try {
    const { tenantId } = req.user!;
    const { id } = req.params;

    const workflow = await findWorkflowById(id, tenantId);
    if (!workflow) {
      res.status(404).json({
        success: false,
        error: "Workflow not found",
        code: "WORKFLOW_NOT_FOUND",
      });
      return;
    }

    const updated = await enableWebhook(id, tenantId);

    const dag = await WorkflowDAGModel.findOne({ workflowId: id }).sort({
      version: -1,
    });
    const triggerNode = dag?.dag.nodes.find((n) => n.type === "trigger");
    const triggerType = triggerNode?.config["triggerType"];

    if (
      triggerType === "schedule" &&
      typeof triggerNode?.config["cronExpression"] === "string"
    ) {
      registerWorkflowSchedule(
        id,
        tenantId,
        triggerNode.config["cronExpression"] as string,
      );

      const cronExpr = triggerNode.config["cronExpression"] as string;
      const validation = validateCronExpression(cronExpr);

      res.status(200).json({
        success: true,
        data: {
          webhookSecret: updated.webhook_secret,
          schedule: {
            cronExpression: cronExpr,
            description: validation.description,
            nextRuns: validation.nextRuns,
          },
        },
      });
      return;
    }

    const baseUrl = process.env["BASE_URL"] ?? "http://localhost:3001";
    const webhookUrl = `${baseUrl}/api/v1/webhooks/trigger/${updated.webhook_secret}`;

    res.status(200).json({
      success: true,
      data: {
        webhookSecret: updated.webhook_secret,
        webhookUrl,
      },
    });
  } catch (err) {
    next(err);
  }
});

workflowRouter.post("/:id/webhook/disable", async (req, res, next) => {
  try {
    const { tenantId } = req.user!;
    const { id } = req.params;

    const workflow = await findWorkflowById(id, tenantId);
    if (!workflow) {
      res.status(404).json({
        success: false,
        error: "Workflow not found",
        code: "WORKFLOW_NOT_FOUND",
      });
      return;
    }

    await disableWebhook(id, tenantId);
    unregisterWorkflowSchedule(id);

    res.status(200).json({
      success: true,
      data: { disabled: true },
    });
  } catch (err) {
    next(err);
  }
});
