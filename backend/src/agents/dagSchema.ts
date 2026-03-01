import { z } from "zod";

export const nodeTypeEnum = z.enum([
  "trigger",
  "condition",
  "delay",
  "notification",
  "send_email",
  "post_slack",
  "post_discord",
  "create_github_issue",
  "http_request",
  "data_transform",
]);

export const dagNodeSchema = z.object({
  id: z.string().min(1),
  type: nodeTypeEnum,
  label: z.string().min(1),
  config: z.record(z.string(), z.unknown()).default({}),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
});

export const dagEdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  label: z.string().optional(),
});

export const workflowDAGResponseSchema = z.object({
  nodes: z.array(dagNodeSchema).min(1),
  edges: z.array(dagEdgeSchema).min(1),
  suggestedName: z.string().min(1).max(255),
  description: z.string().min(1),
});

export type NodeType = z.infer<typeof nodeTypeEnum>;
export type DAGNode = z.infer<typeof dagNodeSchema>;
export type DAGEdge = z.infer<typeof dagEdgeSchema>;
export type WorkflowDAGResponse = z.infer<typeof workflowDAGResponseSchema>;
