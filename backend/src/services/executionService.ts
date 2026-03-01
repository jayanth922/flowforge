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
import { integrationRegistry, renderTemplate } from "../integrations/index.js";
import { getIntegrationById } from "../models/integrationPg.model.js";

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 500;
const DEMO_DELAY_CAP_MS = 2000;

interface ExecutionContext {
  payload: Record<string, unknown>;
  steps: Record<string, { output: Record<string, unknown> }>;
}

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

const extractByPath = (obj: unknown, path: string): unknown => {
  let current: unknown = obj;
  for (const segment of path.split(".")) {
    if (current === null || current === undefined) return undefined;
    if (Array.isArray(current)) {
      const idx = Number(segment);
      if (Number.isNaN(idx)) return undefined;
      current = current[idx];
    } else if (typeof current === "object") {
      current = (current as Record<string, unknown>)[segment];
    } else {
      return undefined;
    }
  }
  return current;
};

const evaluateCondition = (rendered: string): boolean => {
  const trimmed = rendered.trim();

  const match = trimmed.match(
    /^(.+?)\s*(>=|<=|!=|==|>|<)\s*(.+?)$/,
  );
  if (!match) return true;

  const [, leftRaw, operator, rightRaw] = match;
  const left = leftRaw!.trim();
  const right = rightRaw!.trim();

  const leftNum = Number(left);
  const rightNum = Number(right);
  const bothNumeric = !Number.isNaN(leftNum) && !Number.isNaN(rightNum);

  switch (operator) {
    case ">":
      return bothNumeric ? leftNum > rightNum : left > right;
    case "<":
      return bothNumeric ? leftNum < rightNum : left < right;
    case ">=":
      return bothNumeric ? leftNum >= rightNum : left >= right;
    case "<=":
      return bothNumeric ? leftNum <= rightNum : left <= right;
    case "==":
      return bothNumeric ? leftNum === rightNum : left === right;
    case "!=":
      return bothNumeric ? leftNum !== rightNum : left !== right;
    default:
      return true;
  }
};

const resolveCredentials = async (
  node: IDAGNode,
  tenantId: string,
): Promise<Record<string, unknown> | undefined> => {
  const integrationId = node.config["integrationId"];
  if (typeof integrationId !== "string" || integrationId === "PLACEHOLDER") {
    return undefined;
  }
  const integration = await getIntegrationById(integrationId, tenantId);
  if (!integration) {
    throw new Error("Integration not found or access denied");
  }
  return integration.decryptedCredentials;
};

const executeNodeAction = async (
  node: IDAGNode,
  context: ExecutionContext,
  tenantId: string,
): Promise<Record<string, unknown>> => {
  const ctxRecord = context as unknown as Record<string, unknown>;

  switch (node.type) {
    case "trigger": {
      return { event: "trigger_fired", payload: context.payload };
    }

    case "send_email": {
      const handler = integrationRegistry["send_email"];
      if (!handler) throw new Error("No handler for send_email");
      const result = await handler(node.config, ctxRecord);
      if (!result.success) throw new Error(result.error ?? "send_email failed");
      return result.data ?? {};
    }

    case "post_slack":
    case "post_discord":
    case "create_github_issue":
    case "http_request": {
      const handler = integrationRegistry[node.type];
      if (!handler) {
        throw new Error(`No integration handler for type: ${node.type}`);
      }
      const credentials = await resolveCredentials(node, tenantId);
      const result = await handler(node.config, ctxRecord, credentials);
      if (!result.success) {
        throw new Error(result.error ?? `${node.type} integration failed`);
      }
      return result.data ?? {};
    }

    case "condition": {
      const expression =
        typeof node.config["expression"] === "string"
          ? node.config["expression"]
          : "";
      const rendered = renderTemplate(expression, ctxRecord);
      const result = evaluateCondition(rendered);
      return { result, expression: rendered, evaluated: true };
    }

    case "delay": {
      const duration =
        typeof node.config["duration"] === "number"
          ? node.config["duration"]
          : 1;
      const unit =
        typeof node.config["unit"] === "string"
          ? node.config["unit"]
          : "seconds";

      let ms = duration * 1000;
      if (unit === "minutes") ms = duration * 60_000;
      else if (unit === "hours") ms = duration * 3_600_000;

      const capped = Math.min(ms, DEMO_DELAY_CAP_MS);
      await sleep(capped);
      return { waited: true, duration: `${capped}ms (capped for demo)` };
    }

    case "data_transform": {
      const extractPath =
        typeof node.config["extractPath"] === "string"
          ? node.config["extractPath"]
          : "";
      const outputKey =
        typeof node.config["outputKey"] === "string"
          ? node.config["outputKey"]
          : "extracted";

      const extracted = extractByPath(ctxRecord, extractPath);
      return { [outputKey]: extracted };
    }

    case "notification": {
      await sleep(1000);
      const message =
        typeof node.config["message"] === "string"
          ? renderTemplate(node.config["message"], ctxRecord)
          : node.label;
      const recipient =
        typeof node.config["to"] === "string"
          ? renderTemplate(node.config["to"], ctxRecord)
          : "admin";
      return { notified: true, recipient, message };
    }
  }
};

const executeNode = async (
  node: IDAGNode,
  executionId: string,
  workflowId: string,
  tenantId: string,
  context: ExecutionContext,
): Promise<Record<string, unknown>> => {
  const log = await ExecutionLogModel.create({
    executionId,
    workflowId,
    tenantId,
    stepId: node.id,
    stepLabel: node.label,
    status: "running",
    input: context,
  });

  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) await sleep(RETRY_DELAY_MS);

      const output = await executeNodeAction(node, context, tenantId);

      await ExecutionLogModel.updateOne(
        { _id: log._id },
        {
          status: "completed",
          output,
          completedAt: new Date(),
          retryCount: attempt,
        },
      );

      context.steps[node.id] = { output };
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
  const context: ExecutionContext = {
    payload: triggerPayload,
    steps: {},
  };

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
  userId: string | null,
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
