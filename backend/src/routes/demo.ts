import { Router } from "express";
import { findUserByEmail } from "../models/user.js";
import { listWorkflowsByTenant } from "../models/workflowPg.model.js";
import { WorkflowDAGModel } from "../models/workflow.model.js";

export const demoRouter = Router();

demoRouter.get("/workflows", async (_req, res, next) => {
  try {
    const demoUser = await findUserByEmail("demo@flowforge.com");
    if (!demoUser) {
      res.status(404).json({
        success: false,
        error: "Demo data not seeded",
        code: "DEMO_NOT_FOUND",
      });
      return;
    }

    const workflows = await listWorkflowsByTenant(demoUser.tenant_id);

    const results = await Promise.all(
      workflows.map(async (workflow) => {
        const dag = await WorkflowDAGModel.findOne({
          workflowId: workflow.id,
          tenantId: demoUser.tenant_id,
        }).sort({ version: -1 });

        return { workflow, dag };
      }),
    );

    res.status(200).json({
      success: true,
      data: results,
    });
  } catch (err) {
    next(err);
  }
});
