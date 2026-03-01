import { Router } from "express";
import { z } from "zod";
import { findWorkflowByWebhookSecret } from "../models/workflowPg.model.js";
import { executeWorkflow } from "../services/executionService.js";

export const webhookRouter = Router();

const secretParamSchema = z.object({
  webhookSecret: z.string().length(64).regex(/^[a-f0-9]+$/),
});

const bodySchema = z.object({
  triggerPayload: z.record(z.unknown()).optional(),
});

webhookRouter.post("/trigger/:webhookSecret", async (req, res, next) => {
  try {
    const paramParsed = secretParamSchema.safeParse(req.params);
    if (!paramParsed.success) {
      res.status(400).json({
        success: false,
        error: "Invalid webhook secret format",
        code: "VALIDATION_ERROR",
      });
      return;
    }

    const { webhookSecret } = paramParsed.data;
    const workflow = await findWorkflowByWebhookSecret(webhookSecret);

    if (!workflow) {
      res.status(404).json({
        success: false,
        error: "Webhook not found",
        code: "WEBHOOK_NOT_FOUND",
      });
      return;
    }

    if (!workflow.webhook_enabled) {
      res.status(403).json({
        success: false,
        error: "Webhook not enabled for this workflow",
        code: "WEBHOOK_DISABLED",
      });
      return;
    }

    const bodyParsed = bodySchema.safeParse(req.body);
    const triggerPayload = bodyParsed.success
      ? bodyParsed.data.triggerPayload ?? {}
      : {};

    const executionId = await executeWorkflow(
      workflow.id,
      workflow.tenant_id,
      null,
      triggerPayload,
    );

    res.status(200).json({
      success: true,
      data: {
        executionId,
        message: "Workflow triggered",
      },
    });
  } catch (err) {
    next(err);
  }
});
