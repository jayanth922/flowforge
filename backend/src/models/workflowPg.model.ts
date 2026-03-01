import { query } from "../db/postgres.js";

export interface Workflow {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  created_by: string | null;
  status: "draft" | "active" | "archived";
  created_at: Date;
  updated_at: Date;
}

export interface WorkflowExecution {
  id: string;
  workflow_id: string;
  tenant_id: string;
  triggered_by: string | null;
  status: "pending" | "running" | "completed" | "failed" | "partial";
  started_at: Date | null;
  completed_at: Date | null;
  trigger_payload: Record<string, unknown> | null;
  created_at: Date;
}

export const createWorkflow = async (
  tenantId: string,
  userId: string,
  name: string,
  description: string,
): Promise<Workflow> => {
  const result = await query(
    `INSERT INTO workflows (tenant_id, created_by, name, description)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [tenantId, userId, name, description],
  );
  return result.rows[0] as Workflow;
};

export const findWorkflowById = async (
  id: string,
  tenantId: string,
): Promise<Workflow | null> => {
  const result = await query(
    "SELECT * FROM workflows WHERE id = $1 AND tenant_id = $2",
    [id, tenantId],
  );
  return (result.rows[0] as Workflow | undefined) ?? null;
};

export const listWorkflowsByTenant = async (
  tenantId: string,
): Promise<Workflow[]> => {
  const result = await query(
    "SELECT * FROM workflows WHERE tenant_id = $1 ORDER BY created_at DESC",
    [tenantId],
  );
  return result.rows as Workflow[];
};

export const findExecutionById = async (
  executionId: string,
): Promise<WorkflowExecution | null> => {
  const result = await query(
    "SELECT * FROM workflow_executions WHERE id = $1",
    [executionId],
  );
  return (result.rows[0] as WorkflowExecution | undefined) ?? null;
};

export const createExecution = async (
  workflowId: string,
  tenantId: string,
  triggeredBy: string | null,
  triggerPayload: Record<string, unknown> | null,
): Promise<WorkflowExecution> => {
  const result = await query(
    `INSERT INTO workflow_executions (workflow_id, tenant_id, triggered_by, trigger_payload, started_at)
     VALUES ($1, $2, $3, $4, now())
     RETURNING *`,
    [workflowId, tenantId, triggeredBy, JSON.stringify(triggerPayload)],
  );
  return result.rows[0] as WorkflowExecution;
};

export const updateExecutionStatus = async (
  executionId: string,
  status: WorkflowExecution["status"],
  completedAt?: Date,
): Promise<WorkflowExecution> => {
  const result = await query(
    `UPDATE workflow_executions
     SET status = $1, completed_at = $2
     WHERE id = $3
     RETURNING *`,
    [status, completedAt ?? null, executionId],
  );
  return result.rows[0] as WorkflowExecution;
};
