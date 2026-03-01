import { schedule, validate, type ScheduledTask } from "node-cron";
import cronstrue from "cronstrue";
import { CronExpressionParser } from "cron-parser";
import { query } from "../db/postgres.js";
import { WorkflowDAGModel } from "../models/workflow.model.js";
import { executeWorkflow } from "./executionService.js";
import { logger } from "../utils/logger.js";

const activeJobs = new Map<string, ScheduledTask>();

export const registerWorkflowSchedule = (
  workflowId: string,
  tenantId: string,
  cronExpression: string,
): void => {
  if (!validate(cronExpression)) {
    logger.warn({ workflowId, cronExpression }, "invalid cron expression, skipping registration");
    return;
  }

  const existing = activeJobs.get(workflowId);
  if (existing) {
    existing.stop();
    activeJobs.delete(workflowId);
  }

  const task = schedule(cronExpression, () => {
    executeWorkflow(workflowId, tenantId, null, {
      scheduledAt: new Date().toISOString(),
      trigger: "cron",
    }).catch((err) => {
      logger.error({ err, workflowId }, "scheduled execution failed");
    });
  });

  activeJobs.set(workflowId, task);
  logger.info({ workflowId, cronExpression }, "registered cron schedule");
};

export const unregisterWorkflowSchedule = (workflowId: string): void => {
  const task = activeJobs.get(workflowId);
  if (task) {
    task.stop();
    activeJobs.delete(workflowId);
    logger.info({ workflowId }, "unregistered cron schedule");
  }
};

export const initializeScheduler = async (): Promise<void> => {
  const result = await query(
    "SELECT id, tenant_id FROM workflows WHERE status = 'active' AND webhook_enabled = true",
    [],
  );

  let count = 0;

  for (const row of result.rows as { id: string; tenant_id: string }[]) {
    const dag = await WorkflowDAGModel.findOne({ workflowId: row.id }).sort({
      version: -1,
    });
    if (!dag) continue;

    const triggerNode = dag.dag.nodes.find((n) => n.type === "trigger");
    if (!triggerNode) continue;

    const triggerType = triggerNode.config["triggerType"];
    const cronExpression = triggerNode.config["cronExpression"];

    if (triggerType === "schedule" && typeof cronExpression === "string") {
      registerWorkflowSchedule(row.id, row.tenant_id, cronExpression);
      count++;
    }
  }

  logger.info({ count }, "scheduler initialized");
};

export const validateCronExpression = (
  expr: string,
): { valid: boolean; description: string; nextRuns: string[] } => {
  if (!validate(expr)) {
    return { valid: false, description: "Invalid cron expression", nextRuns: [] };
  }

  let description: string;
  try {
    description = cronstrue.toString(expr);
  } catch {
    description = expr;
  }

  const nextRuns: string[] = [];
  try {
    const interval = CronExpressionParser.parse(expr);
    for (let i = 0; i < 3; i++) {
      const iso = interval.next().toISOString();
      if (iso) nextRuns.push(iso);
    }
  } catch {
    // unable to compute next runs
  }

  return { valid: true, description, nextRuns };
};
