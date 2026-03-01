export interface SafeUser {
  id: string;
  tenant_id: string;
  email: string;
  role: "admin" | "member";
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  user: SafeUser;
  accessToken: string;
  refreshToken: string;
}

export interface Workflow {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  created_by: string | null;
  status: "draft" | "active" | "archived";
  created_at: string;
  updated_at: string;
}

export type NodeType =
  | "trigger"
  | "action"
  | "condition"
  | "delay"
  | "notification";

export interface DAGNode {
  id: string;
  type: NodeType;
  label: string;
  config: Record<string, unknown>;
  position: { x: number; y: number };
}

export interface DAGEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

export interface WorkflowDAGResponse {
  nodes: DAGNode[];
  edges: DAGEdge[];
  suggestedName: string;
  description: string;
}

export interface CompileResponse {
  workflowId: string;
  dag: WorkflowDAGResponse;
}

export type StepStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "skipped";

export interface ExecutionStep {
  stepId: string;
  stepLabel: string;
  status: StepStatus;
  startedAt: string;
  completedAt: string | null;
  output: Record<string, unknown>;
  error: string | null;
  retryCount: number;
}

export interface ExecutionStatusResponse {
  executionId: string;
  workflowId: string;
  status: "pending" | "running" | "completed" | "failed" | "partial";
  startedAt: string;
  completedAt: string | null;
  steps: ExecutionStep[];
}

export interface ExecuteResponse {
  executionId: string;
}

export interface WebhookStatusResponse {
  webhookEnabled: boolean;
  webhookUrl: string | null;
}

export interface WebhookEnableResponse {
  webhookSecret: string;
  webhookUrl: string;
}

export interface WorkflowDAG {
  _id: string;
  workflowId: string;
  tenantId: string;
  version: number;
  naturalLanguagePrompt: string;
  dag: {
    nodes: DAGNode[];
    edges: DAGEdge[];
  };
  compiledAt: string;
  compiledBy: string;
}
