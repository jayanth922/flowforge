import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { executeWorkflow } from "../services/executionService.js";
import {
  findWorkflowById,
  findExecutionById,
} from "../models/workflowPg.model.js";
import { ExecutionLogModel } from "../models/workflow.model.js";

export const workflowExecuteRouter = Router();
export const executionRouter = Router();

workflowExecuteRouter.use(requireAuth);
executionRouter.use(requireAuth);

const executeSchema = z.object({
  triggerPayload: z.record(z.string(), z.unknown()).optional().default({}),
});

workflowExecuteRouter.post("/:id/execute", async (req, res, next) => {
  try {
    const parsed = executeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: parsed.error.errors.map((e) => e.message).join(", "),
        code: "VALIDATION_ERROR",
      });
      return;
    }

    const { id } = req.params;
    const { userId, tenantId } = req.user!;

    const workflow = await findWorkflowById(id, tenantId);
    if (!workflow) {
      res.status(404).json({
        success: false,
        error: "Workflow not found",
        code: "WORKFLOW_NOT_FOUND",
      });
      return;
    }

    const executionId = await executeWorkflow(
      id,
      tenantId,
      userId,
      parsed.data.triggerPayload,
    );

    res.status(202).json({
      success: true,
      data: { executionId },
    });
  } catch (err) {
    next(err);
  }
});

executionRouter.get("/:executionId/status", async (req, res, next) => {
  try {
    const { executionId } = req.params;
    const { tenantId } = req.user!;

    const execution = await findExecutionById(executionId);
    if (!execution || execution.tenant_id !== tenantId) {
      res.status(404).json({
        success: false,
        error: "Execution not found",
        code: "EXECUTION_NOT_FOUND",
      });
      return;
    }

    const logs = await ExecutionLogModel.find({ executionId }).sort({
      startedAt: 1,
    });

    res.status(200).json({
      success: true,
      data: {
        executionId: execution.id,
        workflowId: execution.workflow_id,
        status: execution.status,
        startedAt: execution.started_at,
        completedAt: execution.completed_at,
        steps: logs.map((log) => ({
          stepId: log.stepId,
          stepLabel: log.stepLabel,
          status: log.status,
          startedAt: log.startedAt,
          completedAt: log.completedAt ?? null,
          output: log.output ?? {},
          error: log.error ?? null,
          retryCount: log.retryCount,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
});
