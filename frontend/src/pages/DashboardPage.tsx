import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listWorkflows } from "../services/api";
import NavHeader from "../components/NavHeader";
import type { Workflow } from "../types/api";

const STATUS_BADGE: Record<Workflow["status"], string> = {
  draft: "bg-gray-600/30 text-gray-300",
  active: "bg-green-600/30 text-green-300",
  archived: "bg-red-600/30 text-red-300",
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

const SkeletonCard = () => (
  <div className="flex flex-col gap-3 rounded-lg border border-gray-800 bg-gray-900/50 p-4 animate-pulse">
    <div className="flex items-center justify-between">
      <div className="h-4 w-32 rounded bg-gray-700" />
      <div className="h-5 w-14 rounded-full bg-gray-700" />
    </div>
    <div className="h-3 w-full rounded bg-gray-800" />
    <div className="h-3 w-2/3 rounded bg-gray-800" />
    <div className="mt-auto h-3 w-20 rounded bg-gray-800" />
  </div>
);

const DashboardPage = () => {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "FlowForge — Dashboard";
  }, []);

  useEffect(() => {
    listWorkflows()
      .then(setWorkflows)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-950">
      <NavHeader />

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Your Workflows</h2>
          <button
            onClick={() => navigate("/workflows/new")}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
          >
            New Workflow
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : workflows.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-700 py-20">
            <p className="mb-4 text-gray-500">
              No workflows yet. Create your first workflow &rarr;
            </p>
            <button
              onClick={() => navigate("/workflows/new")}
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500"
            >
              Create Workflow
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {workflows.map((w) => (
              <button
                key={w.id}
                onClick={() => navigate(`/workflows/${w.id}`)}
                className="flex flex-col gap-2 rounded-lg border border-gray-800 bg-gray-900/50 p-4 text-left transition-colors hover:border-gray-700 hover:bg-gray-900"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-white">{w.name}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_BADGE[w.status]}`}
                  >
                    {w.status}
                  </span>
                </div>
                {w.description && (
                  <p className="line-clamp-2 text-sm text-gray-500">
                    {w.description}
                  </p>
                )}
                <p className="mt-auto text-xs text-gray-600">
                  {formatDate(w.created_at)}
                </p>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default DashboardPage;
