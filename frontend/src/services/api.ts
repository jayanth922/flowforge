import axios from "axios";
import type {
  AuthResponse,
  CompileResponse,
  ExecuteResponse,
  ExecutionStatusResponse,
  WebhookEnableResponse,
  WebhookStatusResponse,
  Workflow,
  WorkflowDAG,
} from "../types/api";

const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}/api/v1`,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

export const login = async (
  email: string,
  password: string,
): Promise<AuthResponse> => {
  const res = await api.post<{ success: true; data: AuthResponse }>(
    "/auth/login",
    { email, password },
  );
  return res.data.data;
};

export const register = async (
  email: string,
  password: string,
  tenantName: string,
): Promise<AuthResponse> => {
  const res = await api.post<{ success: true; data: AuthResponse }>(
    "/auth/register",
    { email, password, tenantName },
  );
  return res.data.data;
};

export const compileWorkflow = async (
  prompt: string,
): Promise<CompileResponse> => {
  const res = await api.post<{ success: true; data: CompileResponse }>(
    "/workflows/compile",
    { prompt },
  );
  return res.data.data;
};

export const listWorkflows = async (): Promise<Workflow[]> => {
  const res = await api.get<{ success: true; data: Workflow[] }>("/workflows");
  return res.data.data;
};

export const getWorkflowDag = async (
  workflowId: string,
): Promise<WorkflowDAG> => {
  const res = await api.get<{ success: true; data: WorkflowDAG }>(
    `/workflows/${workflowId}/dag`,
  );
  return res.data.data;
};

export const executeWorkflow = async (
  workflowId: string,
  triggerPayload?: Record<string, unknown>,
): Promise<ExecuteResponse> => {
  const res = await api.post<{ success: true; data: ExecuteResponse }>(
    `/workflows/${workflowId}/execute`,
    { triggerPayload: triggerPayload ?? {} },
  );
  return res.data.data;
};

export const getWebhookStatus = async (
  workflowId: string,
): Promise<WebhookStatusResponse> => {
  const res = await api.get<{ success: true; data: WebhookStatusResponse }>(
    `/workflows/${workflowId}/webhook`,
  );
  return res.data.data;
};

export const enableWebhook = async (
  workflowId: string,
): Promise<WebhookEnableResponse> => {
  const res = await api.post<{ success: true; data: WebhookEnableResponse }>(
    `/workflows/${workflowId}/webhook/enable`,
  );
  return res.data.data;
};

export const disableWebhook = async (
  workflowId: string,
): Promise<void> => {
  await api.post(`/workflows/${workflowId}/webhook/disable`);
};

export interface CronValidationResponse {
  valid: boolean;
  description: string;
  nextRuns: string[];
}

export const validateCron = async (
  expr: string,
): Promise<CronValidationResponse> => {
  const res = await api.get<{ success: true; data: CronValidationResponse }>(
    "/workflows/validate-cron",
    { params: { expr } },
  );
  return res.data.data;
};

export interface WorkflowStats {
  totalExecutions: number;
  lastRunAt: string | null;
  lastStatus: string | null;
}

export const getWorkflowStats = async (): Promise<Record<string, WorkflowStats>> => {
  const res = await api.get<{ success: true; data: Record<string, WorkflowStats> }>(
    "/workflows/stats",
  );
  return res.data.data;
};

export const getExecutionStatus = async (
  executionId: string,
): Promise<ExecutionStatusResponse> => {
  const res = await api.get<{
    success: true;
    data: ExecutionStatusResponse;
  }>(`/executions/${executionId}/status`);
  return res.data.data;
};
