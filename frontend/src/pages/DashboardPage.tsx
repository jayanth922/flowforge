import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listWorkflows, getWorkflowStats, type WorkflowStats } from "../services/api";
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

const formatRelativeTime = (iso: string): string => {
  const diff = Date.now() - new Date(iso).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

const STATUS_ICON: Record<string, string> = {
  completed: "\u2705",
  failed: "\u274C",
  running: "\u{1F504}",
  pending: "\u23F3",
  partial: "\u26A0\uFE0F",
};

const DashboardPage = () => {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [stats, setStats] = useState<Record<string, WorkflowStats>>({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "FlowForge \u2014 Dashboard";
  }, []);

  useEffect(() => {
    Promise.all([listWorkflows(), getWorkflowStats()])
      .then(([wf, st]) => {
        setWorkflows(wf);
        setStats(st);
      })
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
                {(() => {
                  const s = stats[w.id];
                  if (!s) return <p className="mt-1 text-xs text-gray-600">No executions yet</p>;
                  return (
                    <p className="mt-1 text-xs text-gray-500">
                      Last run: {s.lastRunAt ? formatRelativeTime(s.lastRunAt) : "—"} {STATUS_ICON[s.lastStatus ?? ""] ?? ""} {s.lastStatus}
                      <span className="ml-2 text-gray-600">
                        &middot; {s.totalExecutions} execution{s.totalExecutions !== 1 ? "s" : ""}
                      </span>
                    </p>
                  );
                })()}
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
