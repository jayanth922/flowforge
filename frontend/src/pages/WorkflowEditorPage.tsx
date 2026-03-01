import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  compileWorkflow,
  getWorkflowDag,
  executeWorkflow,
} from "../services/api";
import { useExecutionStatus } from "../hooks/useExecutionStatus";
import NavHeader from "../components/NavHeader";
import PromptPanel from "../components/workflow/PromptPanel";
import WorkflowCanvas from "../components/workflow/WorkflowCanvas";
import ExecutionLogPanel from "../components/workflow/ExecutionLogPanel";
import type { DAGNode, DAGEdge, StepStatus } from "../types/api";
import "@xyflow/react/dist/style.css";

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

const WorkflowEditorPage = () => {
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
    if (isNewMode) return;

    getWorkflowDag(id)
      .then((dag) => {
        setNodes(dag.dag.nodes);
        setEdges(dag.dag.edges);
        setPrompt(dag.naturalLanguagePrompt);
      })
      .catch(() => {
        setError("Failed to load workflow");
      })
      .finally(() => setPageLoading(false));
  }, [id, isNewMode]);

  const handleCompile = async () => {
    setLoading(true);
    setError(null);
    setExecutionId(null);

    try {
      const response = await compileWorkflow(prompt);
      setNodes(response.dag.nodes);
      setEdges(response.dag.edges);
      setWorkflowId(response.workflowId);
      setWorkflowName(response.dag.suggestedName ?? null);

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
        </div>

        <div className="flex w-[70%] flex-col">
          {execError && (
            <div className="mx-4 mt-2 rounded-lg border border-red-800 bg-red-900/30 p-3 text-sm text-red-300">
              {execError}
            </div>
          )}

          <div className="flex-1">
            <WorkflowCanvas
              nodes={nodes}
              edges={edges}
              stepStatuses={stepStatuses}
            />
          </div>

          <ExecutionLogPanel steps={steps} status={executionStatus} />
        </div>
      </div>
    </div>
  );
};

export default WorkflowEditorPage;
