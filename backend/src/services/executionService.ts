import {
  WorkflowDAGModel,
  ExecutionLogModel,
  type IDAGNode,
  type IDAGEdge,
} from "../models/workflow.model.js";
import {
  createExecution,
  updateExecutionStatus,
} from "../models/workflowPg.model.js";
import { logger } from "../utils/logger.js";

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 500;

const topologicalSort = (nodes: IDAGNode[], edges: IDAGEdge[]): IDAGNode[] => {
  const adjacency = new Map<string, string[]>();
  const inDegree = new Map<string, number>();
  const nodeMap = new Map<string, IDAGNode>();

  for (const node of nodes) {
    adjacency.set(node.id, []);
    inDegree.set(node.id, 0);
    nodeMap.set(node.id, node);
  }

  for (const edge of edges) {
    adjacency.get(edge.source)?.push(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
  }

  const queue: string[] = [];
  for (const [nodeId, degree] of inDegree) {
    if (degree === 0) queue.push(nodeId);
  }

  const sorted: IDAGNode[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    const node = nodeMap.get(current);
    if (node) sorted.push(node);

    for (const neighbor of adjacency.get(current) ?? []) {
      const newDegree = (inDegree.get(neighbor) ?? 1) - 1;
      inDegree.set(neighbor, newDegree);
      if (newDegree === 0) queue.push(neighbor);
    }
  }

  return sorted;
};

const simulateNode = async (
  node: IDAGNode,
  context: Map<string, Record<string, unknown>>,
): Promise<Record<string, unknown>> => {
  switch (node.type) {
    case "trigger": {
      const payload = context.get("trigger_payload") ?? {};
      return { event: "trigger_fired", payload };
    }
    case "action": {
      await sleep(1500);
      return { success: true, message: `Executed: ${node.label}` };
    }
    case "condition": {
      return { result: true, evaluated: node.label };
    }
    case "delay": {
      await sleep(2000);
      return { waited: true, duration: "2s (capped for demo)" };
    }
    case "notification": {
      await sleep(1000);
      const recipient =
        typeof node.config["to"] === "string" ? node.config["to"] : "admin";
      return { notified: true, recipient };
    }
  }
};

const executeNode = async (
  node: IDAGNode,
  executionId: string,
  workflowId: string,
  tenantId: string,
  context: Map<string, Record<string, unknown>>,
): Promise<Record<string, unknown>> => {
  const log = await ExecutionLogModel.create({
    executionId,
    workflowId,
    tenantId,
    stepId: node.id,
    stepLabel: node.label,
    status: "running",
    input: Object.fromEntries(context),
  });

  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) await sleep(RETRY_DELAY_MS);

      const output = await simulateNode(node, context);

      await ExecutionLogModel.updateOne(
        { _id: log._id },
        {
          status: "completed",
          output,
          completedAt: new Date(),
          retryCount: attempt,
        },
      );

      context.set(node.id, output);
      return output;
    } catch (err) {
      lastError = err;
    }
  }

  const errorMessage =
    lastError instanceof Error ? lastError.message : "Unknown error";

  await ExecutionLogModel.updateOne(
    { _id: log._id },
    {
      status: "failed",
      error: errorMessage,
      completedAt: new Date(),
      retryCount: MAX_RETRIES,
    },
  );

  throw lastError;
};

const runExecution = async (
  executionId: string,
  nodes: IDAGNode[],
  edges: IDAGEdge[],
  workflowId: string,
  tenantId: string,
  triggerPayload: Record<string, unknown>,
): Promise<void> => {
  const sorted = topologicalSort(nodes, edges);
  const context = new Map<string, Record<string, unknown>>();
  context.set("trigger_payload", triggerPayload);

  let failed = false;

  for (const node of sorted) {
    try {
      await executeNode(node, executionId, workflowId, tenantId, context);
    } catch {
      failed = true;
      break;
    }
  }

  await updateExecutionStatus(
    executionId,
    failed ? "failed" : "completed",
    new Date(),
  );
};

export const executeWorkflow = async (
  workflowId: string,
  tenantId: string,
  userId: string,
  triggerPayload: Record<string, unknown>,
): Promise<string> => {
  const dagDoc = await WorkflowDAGModel.findOne({
    workflowId,
    tenantId,
  }).sort({ version: -1 });

  if (!dagDoc) {
    throw new Error("No compiled DAG found for this workflow");
  }

  const execution = await createExecution(
    workflowId,
    tenantId,
    userId,
    triggerPayload,
  );

  void runExecution(
    execution.id,
    dagDoc.dag.nodes,
    dagDoc.dag.edges,
    workflowId,
    tenantId,
    triggerPayload,
  ).catch((err) => {
    logger.error({ err, workflowId, executionId: execution.id }, "background execution failed");
  });

  return execution.id;
};
