import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  compileWorkflow,
  getWorkflowDag,
  executeWorkflow,
} from "../services/api";
import { useExecutionStatus } from "../hooks/useExecutionStatus";
import PromptPanel from "../components/workflow/PromptPanel";
import WorkflowCanvas from "../components/workflow/WorkflowCanvas";
import ExecutionLogPanel from "../components/workflow/ExecutionLogPanel";
import type { DAGNode, DAGEdge, StepStatus } from "../types/api";
import "@xyflow/react/dist/style.css";

const WorkflowEditorPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isNewMode = !id || id === "new";

  const [prompt, setPrompt] = useState("");
  const [nodes, setNodes] = useState<DAGNode[]>([]);
  const [edges, setEdges] = useState<DAGEdge[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

      if (isNewMode) {
        navigate(`/workflows/${response.workflowId}`, { replace: true });
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Compilation failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async () => {
    if (!workflowId) return;

    try {
      const response = await executeWorkflow(workflowId);
      setExecutionId(response.executionId);
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Execution failed to start.");
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

  const canExecute =
    nodes.length > 0 && workflowId && !isRunning && !loading;

  return (
    <div className="flex h-screen flex-col bg-gray-950">
      <header className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
        <Link
          to="/dashboard"
          className="text-sm text-gray-400 transition-colors hover:text-white"
        >
          &larr; Back to Dashboard
        </Link>

        {canExecute && (
          <button
            onClick={handleExecute}
            className="rounded-lg bg-green-600 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-green-500"
          >
            Execute Workflow
          </button>
        )}

        {isRunning && (
          <span className="flex items-center gap-2 text-sm text-blue-400">
            <span className="h-2 w-2 animate-pulse rounded-full bg-blue-400" />
            Executing...
          </span>
        )}
      </header>

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
