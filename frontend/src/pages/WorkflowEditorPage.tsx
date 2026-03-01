import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { compileWorkflow, getWorkflowDag } from "../services/api";
import PromptPanel from "../components/workflow/PromptPanel";
import WorkflowCanvas from "../components/workflow/WorkflowCanvas";
import type { DAGNode, DAGEdge } from "../types/api";
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

    try {
      const response = await compileWorkflow(prompt);
      setNodes(response.dag.nodes);
      setEdges(response.dag.edges);

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

  if (pageLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-950">
        <p className="text-gray-500">Loading workflow...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-gray-950">
      <header className="flex items-center border-b border-gray-800 px-4 py-3">
        <Link
          to="/dashboard"
          className="text-sm text-gray-400 transition-colors hover:text-white"
        >
          &larr; Back to Dashboard
        </Link>
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

        <div className="w-[70%]">
          <WorkflowCanvas nodes={nodes} edges={edges} />
        </div>
      </div>
    </div>
  );
};

export default WorkflowEditorPage;
