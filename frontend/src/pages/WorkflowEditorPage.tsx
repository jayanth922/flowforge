import { Component, useEffect, useState, useMemo, useCallback } from "react";
import type { ReactNode, ErrorInfo } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import {
  compileWorkflow,
  getWorkflowDag,
  executeWorkflow,
  getWebhookStatus,
  enableWebhook,
  disableWebhook,
  validateCron,
  listIntegrations,
  type CronValidationResponse,
  type IntegrationSummary,
} from "../services/api";
import { useExecutionStatus } from "../hooks/useExecutionStatus";
import NavHeader from "../components/NavHeader";
import PromptPanel from "../components/workflow/PromptPanel";
import WorkflowCanvas from "../components/workflow/WorkflowCanvas";
import ExecutionLogPanel from "../components/workflow/ExecutionLogPanel";
import type { DAGNode, DAGEdge, StepStatus, NodeType } from "../types/api";
import "@xyflow/react/dist/style.css";

class EditorErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("WorkflowEditorPage crashed:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen flex-col items-center justify-center bg-gray-950 text-white">
          <h2 className="mb-2 text-lg font-semibold">Something went wrong</h2>
          <p className="mb-4 max-w-md text-center text-sm text-gray-400">
            {this.state.message || "An unexpected error occurred while rendering this page."}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, message: "" });
              window.location.reload();
            }}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const Spinner = () => (
  <svg
    className="h-4 w-4 animate-spin text-white"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
    />
  </svg>
);

const WorkflowEditorPageInner = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNewMode = !id || id === "new";

  const [prompt, setPrompt] = useState("");
  const [workflowName, setWorkflowName] = useState<string | null>(null);
  const [nodes, setNodes] = useState<DAGNode[]>([]);
  const [edges, setEdges] = useState<DAGEdge[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [execError, setExecError] = useState<string | null>(null);
  const [pageLoading, setPageLoading] = useState(!isNewMode);
  const [workflowId, setWorkflowId] = useState<string | null>(
    isNewMode ? null : id,
  );

  const [webhookEnabled, setWebhookEnabled] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState<string | null>(null);
  const [webhookLoading, setWebhookLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const [cronExpr, setCronExpr] = useState("");
  const [cronValidation, setCronValidation] = useState<CronValidationResponse | null>(null);
  const [cronValidating, setCronValidating] = useState(false);

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [availableIntegrations, setAvailableIntegrations] = useState<IntegrationSummary[]>([]);

  const [executionId, setExecutionId] = useState<string | null>(null);
  const { executionStatus, steps, isRunning } =
    useExecutionStatus(executionId);

  const stepStatuses = useMemo(() => {
    if (steps.length === 0) return undefined;
    const map = new Map<string, StepStatus>();
    for (const step of steps) {
      map.set(step.stepId, step.status);
    }
    return map;
  }, [steps]);

  useEffect(() => {
    document.title = workflowName
      ? `FlowForge — ${workflowName} | Editor`
      : "FlowForge — Editor";
  }, [workflowName]);

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), 5000);
    return () => clearTimeout(timer);
  }, [error]);

  useEffect(() => {
    if (!execError) return;
    const timer = setTimeout(() => setExecError(null), 5000);
    return () => clearTimeout(timer);
  }, [execError]);

  useEffect(() => {
    if (!isNewMode) return;
    const stored = localStorage.getItem("flowforge_template");
    if (!stored) return;
    localStorage.removeItem("flowforge_template");
    try {
      const template = JSON.parse(stored) as {
        prompt: string;
        nodes: DAGNode[];
        edges: DAGEdge[];
      };
      setPrompt("");
      setNodes([]);
      setEdges([]);
      setWorkflowName(null);
      setWorkflowId(null);
      setError(null);
      setExecError(null);
      setExecutionId(null);
      setSelectedNodeId(null);
      setAvailableIntegrations([]);
      setWebhookEnabled(false);
      setWebhookUrl(null);
      setCronExpr("");
      setCronValidation(null);

      setPrompt(template.prompt ?? "");
      setNodes(template.nodes ?? []);
      setEdges(template.edges ?? []);
    } catch {
      // ignore malformed template
    }
  }, [isNewMode]);

  useEffect(() => {
    if (isNewMode) return;

    let mounted = true;

    getWorkflowDag(id)
      .then((dag) => {
        if (!mounted) return;
        setNodes(dag.dag.nodes ?? []);
        setEdges(dag.dag.edges ?? []);
        setPrompt(dag.naturalLanguagePrompt ?? "");

        const trigger = dag.dag.nodes.find((n) => n.type === "trigger");
        if (trigger?.config?.cronExpression && typeof trigger.config.cronExpression === "string") {
          setCronExpr(trigger.config.cronExpression);
        }
      })
      .catch(() => {
        if (mounted) setError("Failed to load workflow");
      })
      .finally(() => {
        if (mounted) setPageLoading(false);
      });

    getWebhookStatus(id)
      .then((status) => {
        if (!mounted) return;
        setWebhookEnabled(status.webhookEnabled);
        setWebhookUrl(status.webhookUrl);
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, [id, isNewMode]);

  const handleCompile = async () => {
    setLoading(true);
    setError(null);
    setExecutionId(null);

    try {
      const response = await compileWorkflow(prompt);
      setNodes(response.dag?.nodes ?? []);
      setEdges(response.dag?.edges ?? []);
      setWorkflowId(response.workflowId ?? null);
      setWorkflowName(response.dag?.suggestedName ?? null);

      if (isNewMode) {
        navigate(`/workflows/${response.workflowId}`, { replace: true });
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Compilation failed. Try rephrasing your prompt.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async () => {
    if (!workflowId) return;

    try {
      setExecError(null);
      const response = await executeWorkflow(workflowId);
      setExecutionId(response.executionId);
    } catch (err) {
      if (err instanceof Error) {
        setExecError(err.message);
      } else {
        setExecError("Execution failed to start.");
      }
    }
  };

  const handleWebhookToggle = async () => {
    if (!workflowId) return;
    setWebhookLoading(true);
    try {
      if (webhookEnabled) {
        await disableWebhook(workflowId);
        setWebhookEnabled(false);
      } else {
        const result = await enableWebhook(workflowId);
        setWebhookEnabled(true);
        setWebhookUrl(result.webhookUrl);
      }
    } catch {
      setExecError("Failed to update webhook");
    } finally {
      setWebhookLoading(false);
    }
  };

  const handleCopyUrl = async () => {
    if (!webhookUrl) return;
    await navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleValidateCron = async () => {
    if (!cronExpr.trim()) return;
    setCronValidating(true);
    try {
      const result = await validateCron(cronExpr.trim());
      setCronValidation(result);
    } catch {
      setCronValidation({ valid: false, description: "Validation failed", nextRuns: [] });
    } finally {
      setCronValidating(false);
    }
  };

  const selectedNode = useMemo(
    () => (selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) ?? null : null),
    [selectedNodeId, nodes],
  );

  const serviceForNodeType = (type: NodeType): string | null => {
    switch (type) {
      case "post_slack": return "slack";
      case "post_discord": return "discord";
      case "create_github_issue": return "github";
      case "http_request": return "http";
      default: return null;
    }
  };

  const handleNodeClick = useCallback(
    (nodeId: string) => {
      setSelectedNodeId(nodeId);
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;
      const svc = serviceForNodeType(node.type);
      if (svc) {
        listIntegrations(svc)
          .then(setAvailableIntegrations)
          .catch(() => setAvailableIntegrations([]));
      } else {
        setAvailableIntegrations([]);
      }
    },
    [nodes],
  );

  const updateNodeConfig = useCallback(
    (nodeId: string, key: string, value: unknown) => {
      setNodes((prev) =>
        prev.map((n) =>
          n.id === nodeId ? { ...n, config: { ...n.config, [key]: value } } : n,
        ),
      );
    },
    [],
  );

  const triggerType = useMemo(() => {
    const triggerNode = nodes.find((n) => n.type === "trigger");
    if (!triggerNode) return "manual";
    const tt = triggerNode.config?.triggerType;
    if (tt === "schedule" || tt === "webhook") return tt;
    return "manual";
  }, [nodes]);

  if (pageLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950">
        <p className="text-gray-500">Loading workflow...</p>
      </div>
    );
  }

  const showExecuteButton = nodes.length > 0 && workflowId;

  return (
    <div className="flex h-screen flex-col bg-gray-950">
      <NavHeader />

      <div className="flex items-center justify-between border-b border-gray-800 px-4 py-2">
        <span className="text-sm text-gray-400">
          {workflowName ?? "New Workflow"}
        </span>

        {showExecuteButton && (
          <button
            onClick={handleExecute}
            disabled={isRunning || loading}
            className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-green-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isRunning ? (
              <>
                <Spinner />
                Running...
              </>
            ) : (
              "Execute Workflow"
            )}
          </button>
        )}
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-[30%] overflow-y-auto border-r border-gray-800">
          <PromptPanel
            prompt={prompt}
            onPromptChange={setPrompt}
            onCompile={handleCompile}
            loading={loading}
            error={error}
          />

          {workflowId && triggerType !== "manual" && (
            <div className="border-t border-gray-800 px-4 py-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-300">
                  {triggerType === "schedule" ? "Schedule" : "Webhook"}
                </span>
                <button
                  onClick={handleWebhookToggle}
                  disabled={webhookLoading}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-50 ${
                    webhookEnabled ? "bg-indigo-600" : "bg-gray-700"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                      webhookEnabled ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {triggerType === "webhook" && webhookEnabled && webhookUrl && (
                <div className="mt-3">
                  <label className="mb-1 block text-xs text-gray-500">
                    POST to this URL to trigger this workflow from any external
                    system
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={webhookUrl}
                      className="flex-1 rounded-md border border-gray-700 bg-gray-900 px-3 py-1.5 text-xs text-gray-300 focus:outline-none"
                    />
                    <button
                      onClick={handleCopyUrl}
                      className="shrink-0 rounded-md border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs text-gray-300 transition-colors hover:bg-gray-700"
                    >
                      {copied ? "Copied!" : "Copy"}
                    </button>
                  </div>
                </div>
              )}

              {triggerType === "schedule" && webhookEnabled && (
                <div className="mt-3">
                  <label className="mb-1 block text-xs text-gray-500">
                    Cron expression
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={cronExpr}
                      onChange={(e) => {
                        setCronExpr(e.target.value);
                        setCronValidation(null);
                      }}
                      placeholder="0 9 * * *"
                      className="flex-1 rounded-md border border-gray-700 bg-gray-900 px-3 py-1.5 text-xs text-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <button
                      onClick={handleValidateCron}
                      disabled={cronValidating || !cronExpr.trim()}
                      className="shrink-0 rounded-md border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs text-gray-300 transition-colors hover:bg-gray-700 disabled:opacity-50"
                    >
                      {cronValidating ? "..." : "Validate"}
                    </button>
                  </div>

                  {cronValidation && (
                    <div className="mt-2">
                      {cronValidation.valid ? (
                        <>
                          <p className="text-xs text-green-400">
                            {cronValidation.description}
                          </p>
                          {cronValidation.nextRuns.length > 0 && (
                            <div className="mt-1.5">
                              <p className="text-[10px] font-medium uppercase tracking-wider text-gray-500">
                                Next 3 runs
                              </p>
                              <ul className="mt-0.5 space-y-0.5">
                                {cronValidation.nextRuns.map((run) => (
                                  <li
                                    key={run}
                                    className="text-xs text-gray-400"
                                  >
                                    {new Date(run).toLocaleString()}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </>
                      ) : (
                        <p className="text-xs text-red-400">
                          {cronValidation.description}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex w-[70%] flex-col">
          {execError && (
            <div className="mx-4 mt-2 rounded-lg border border-red-800 bg-red-900/30 p-3 text-sm text-red-300">
              {execError}
            </div>
          )}

          <div className="flex flex-1 overflow-hidden">
            <div className={selectedNode ? "flex-1" : "w-full"}>
              <WorkflowCanvas
                nodes={nodes}
                edges={edges}
                stepStatuses={stepStatuses}
                onNodeClick={handleNodeClick}
              />
            </div>

            {selectedNode && (
              <NodeConfigPanel
                node={selectedNode}
                integrations={availableIntegrations}
                onUpdateConfig={updateNodeConfig}
                onClose={() => setSelectedNodeId(null)}
              />
            )}
          </div>

          <ExecutionLogPanel steps={steps} status={executionStatus} />
        </div>
      </div>
    </div>
  );
};

interface NodeConfigPanelProps {
  node: DAGNode;
  integrations: IntegrationSummary[];
  onUpdateConfig: (nodeId: string, key: string, value: unknown) => void;
  onClose: () => void;
}

const INTEGRATION_NODE_TYPES: NodeType[] = [
  "post_slack",
  "post_discord",
  "create_github_issue",
  "http_request",
];

const NODE_TYPE_LABELS: Record<string, string> = {
  trigger: "Trigger",
  condition: "Condition",
  delay: "Delay",
  notification: "Notification",
  send_email: "Send Email",
  post_slack: "Post to Slack",
  post_discord: "Post to Discord",
  create_github_issue: "Create GitHub Issue",
  http_request: "HTTP Request",
  data_transform: "Data Transform",
};

const NodeConfigPanel = ({
  node,
  integrations,
  onUpdateConfig,
  onClose,
}: NodeConfigPanelProps) => {
  const needsIntegration = INTEGRATION_NODE_TYPES.includes(node.type);
  const currentIntegrationId =
    (node.config["integrationId"] as string | undefined) ?? "";

  return (
    <div className="w-72 shrink-0 overflow-y-auto border-l border-gray-800 bg-gray-900 p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">
          {NODE_TYPE_LABELS[node.type] ?? node.type}
        </h3>
        <button
          onClick={onClose}
          className="text-xs text-gray-500 hover:text-gray-300"
        >
          Close
        </button>
      </div>

      <p className="mb-4 text-xs text-gray-400">{node.label}</p>

      {needsIntegration && (
        <div className="mb-4">
          <label className="mb-1 block text-xs text-gray-400">
            Integration
          </label>
          <select
            value={currentIntegrationId}
            onChange={(e) =>
              onUpdateConfig(node.id, "integrationId", e.target.value)
            }
            className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
          >
            <option value="">Select integration...</option>
            <option value="PLACEHOLDER" disabled>
              -- Not configured --
            </option>
            {integrations.map((ig) => (
              <option key={ig.id} value={ig.id}>
                {ig.name}
              </option>
            ))}
          </select>
          {integrations.length === 0 && (
            <p className="mt-1 text-[10px] text-gray-500">
              No integrations connected. Go to Integrations page to add one.
            </p>
          )}
        </div>
      )}

      {(node.type === "post_slack" || node.type === "post_discord") && (
        <ConfigField
          label="Message"
          type="textarea"
          value={(node.config["message"] as string) ?? ""}
          hint="Use {{payload.field}} for dynamic values"
          onChange={(v) => onUpdateConfig(node.id, "message", v)}
        />
      )}

      {node.type === "send_email" && (
        <>
          <ConfigField
            label="To"
            type="text"
            value={(node.config["to"] as string) ?? ""}
            hint="Email or {{payload.email}}"
            onChange={(v) => onUpdateConfig(node.id, "to", v)}
          />
          <ConfigField
            label="Subject"
            type="text"
            value={(node.config["subject"] as string) ?? ""}
            onChange={(v) => onUpdateConfig(node.id, "subject", v)}
          />
          <ConfigField
            label="Body"
            type="textarea"
            value={(node.config["body"] as string) ?? ""}
            onChange={(v) => onUpdateConfig(node.id, "body", v)}
          />
        </>
      )}

      {node.type === "create_github_issue" && (
        <>
          <ConfigField
            label="Title"
            type="text"
            value={(node.config["title"] as string) ?? ""}
            onChange={(v) => onUpdateConfig(node.id, "title", v)}
          />
          <ConfigField
            label="Body"
            type="textarea"
            value={(node.config["body"] as string) ?? ""}
            onChange={(v) => onUpdateConfig(node.id, "body", v)}
          />
          <ConfigField
            label="Labels (comma-separated)"
            type="text"
            value={
              Array.isArray(node.config["labels"])
                ? (node.config["labels"] as string[]).join(", ")
                : ""
            }
            onChange={(v) =>
              onUpdateConfig(
                node.id,
                "labels",
                v
                  .split(",")
                  .map((s: string) => s.trim())
                  .filter(Boolean),
              )
            }
          />
        </>
      )}

      {node.type === "http_request" && (
        <>
          <div className="mb-3">
            <label className="mb-1 block text-xs text-gray-400">Method</label>
            <select
              value={(node.config["method"] as string) ?? "GET"}
              onChange={(e) =>
                onUpdateConfig(node.id, "method", e.target.value)
              }
              className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
            >
              {["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <ConfigField
            label="URL"
            type="text"
            value={(node.config["url"] as string) ?? ""}
            onChange={(v) => onUpdateConfig(node.id, "url", v)}
          />
          <ConfigField
            label="Body (JSON)"
            type="textarea"
            value={(node.config["body"] as string) ?? ""}
            onChange={(v) => onUpdateConfig(node.id, "body", v)}
          />
          <ConfigField
            label="Extract Path"
            type="text"
            value={(node.config["extractPath"] as string) ?? ""}
            hint='e.g. "data.items.0.title"'
            onChange={(v) => onUpdateConfig(node.id, "extractPath", v)}
          />
        </>
      )}

      {node.type === "condition" && (
        <ConfigField
          label="Expression"
          type="text"
          value={(node.config["expression"] as string) ?? ""}
          hint="e.g. {{payload.amount}} > 500"
          onChange={(v) => onUpdateConfig(node.id, "expression", v)}
        />
      )}

      {node.type === "delay" && (
        <>
          <ConfigField
            label="Duration"
            type="text"
            value={String(node.config["duration"] ?? "")}
            onChange={(v) => onUpdateConfig(node.id, "duration", Number(v) || 0)}
          />
          <div className="mb-3">
            <label className="mb-1 block text-xs text-gray-400">Unit</label>
            <select
              value={(node.config["unit"] as string) ?? "seconds"}
              onChange={(e) =>
                onUpdateConfig(node.id, "unit", e.target.value)
              }
              className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
            >
              {["seconds", "minutes", "hours"].map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      {node.type === "data_transform" && (
        <>
          <ConfigField
            label="Extract Path"
            type="text"
            value={(node.config["extractPath"] as string) ?? ""}
            onChange={(v) => onUpdateConfig(node.id, "extractPath", v)}
          />
          <ConfigField
            label="Output Key"
            type="text"
            value={(node.config["outputKey"] as string) ?? ""}
            onChange={(v) => onUpdateConfig(node.id, "outputKey", v)}
          />
        </>
      )}
    </div>
  );
};

interface ConfigFieldProps {
  label: string;
  type: "text" | "textarea";
  value: string;
  hint?: string;
  onChange: (value: string) => void;
}

const ConfigField = ({ label, type, value, hint, onChange }: ConfigFieldProps) => (
  <div className="mb-3">
    <label className="mb-1 block text-xs text-gray-400">{label}</label>
    {type === "textarea" ? (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-blue-500"
      />
    ) : (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none focus:border-blue-500"
      />
    )}
    {hint && <p className="mt-0.5 text-[10px] text-gray-500">{hint}</p>}
  </div>
);

const WorkflowEditorPage = () => {
  const location = useLocation();
  return (
    <EditorErrorBoundary>
      <WorkflowEditorPageInner key={location.key} />
    </EditorErrorBoundary>
  );
};

export default WorkflowEditorPage;
