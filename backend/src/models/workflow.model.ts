import mongoose, { Schema, type Document } from "mongoose";

export type NodeType =
  | "trigger"
  | "condition"
  | "delay"
  | "notification"
  | "send_email"
  | "post_slack"
  | "post_discord"
  | "create_github_issue"
  | "http_request"
  | "data_transform";

export type StepStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "skipped";

export interface IDAGNode {
  id: string;
  type: NodeType;
  label: string;
  config: Record<string, unknown>;
  position: { x: number; y: number };
}

export interface IDAGEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface IWorkflowDAG extends Document {
  workflowId: string;
  tenantId: string;
  version: number;
  naturalLanguagePrompt: string;
  dag: {
    nodes: IDAGNode[];
    edges: IDAGEdge[];
  };
  compiledAt: Date;
  compiledBy: string;
}

export interface IExecutionLog extends Document {
  executionId: string;
  workflowId: string;
  tenantId: string;
  stepId: string;
  stepLabel: string;
  status: StepStatus;
  startedAt: Date;
  completedAt?: Date;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  error?: string;
  retryCount: number;
}

const dagNodeSchema = new Schema(
  {
    id: { type: String, required: true },
    type: {
      type: String,
      required: true,
      enum: [
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
      ],
    },
    label: { type: String, required: true },
    config: { type: Schema.Types.Mixed, default: {} },
    position: {
      x: { type: Number, required: true },
      y: { type: Number, required: true },
    },
  },
  { _id: false },
);

const dagEdgeSchema = new Schema(
  {
    id: { type: String, required: true },
    source: { type: String, required: true },
    target: { type: String, required: true },
    label: { type: String },
  },
  { _id: false },
);

const workflowDAGSchema = new Schema(
  {
    workflowId: { type: String, required: true },
    tenantId: { type: String, required: true },
    version: { type: Number, required: true },
    naturalLanguagePrompt: { type: String, required: true },
    dag: {
      nodes: { type: [dagNodeSchema], required: true },
      edges: { type: [dagEdgeSchema], required: true },
    },
    compiledAt: { type: Date, required: true, default: Date.now },
    compiledBy: { type: String, required: true },
  },
  { collection: "workflow_dags" },
);

workflowDAGSchema.index({ workflowId: 1, version: 1 }, { unique: true });
workflowDAGSchema.index({ tenantId: 1 });

const executionLogSchema = new Schema(
  {
    executionId: { type: String, required: true },
    workflowId: { type: String, required: true },
    tenantId: { type: String, required: true },
    stepId: { type: String, required: true },
    stepLabel: { type: String, required: true },
    status: {
      type: String,
      required: true,
      enum: ["pending", "running", "completed", "failed", "skipped"],
    },
    startedAt: { type: Date, required: true, default: Date.now },
    completedAt: { type: Date },
    input: { type: Schema.Types.Mixed, default: {} },
    output: { type: Schema.Types.Mixed, default: {} },
    error: { type: String },
    retryCount: { type: Number, required: true, default: 0 },
  },
  { collection: "execution_logs" },
);

executionLogSchema.index({ executionId: 1 });
executionLogSchema.index({ workflowId: 1, tenantId: 1 });
executionLogSchema.index({ executionId: 1, stepId: 1 }, { unique: true });

export const WorkflowDAGModel = mongoose.model<IWorkflowDAG>(
  "WorkflowDAG",
  workflowDAGSchema,
);

export const ExecutionLogModel = mongoose.model<IExecutionLog>(
  "ExecutionLog",
  executionLogSchema,
);
