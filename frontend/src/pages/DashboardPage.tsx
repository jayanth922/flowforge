import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { listWorkflows, getWorkflowStats, type WorkflowStats } from "../services/api";
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
  <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-5 shadow-sm animate-pulse">
    <div className="flex items-center justify-between">
      <div className="h-5 w-1/2 rounded-md bg-gray-200" />
      <div className="h-5 w-14 rounded-full bg-gray-200" />
    </div>
    <div className="h-3 w-full rounded bg-gray-100 mt-2" />
    <div className="h-3 w-3/4 rounded bg-gray-100" />
    <div className="mt-8 h-3 w-24 rounded bg-gray-100" />
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
      .catch(() => { })
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="mx-auto max-w-6xl w-full p-6 md:p-8">
      <main>
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">Your Workflows</h2>
            <p className="mt-1 text-sm font-medium text-gray-500">Manage and monitor your automated processes.</p>
          </div>
          <button
            onClick={() => navigate("/workflows/new")}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-blue-500 active:scale-[0.98] shadow-sm"
          >
            + New Workflow
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : workflows.length === 0 ? (
          <div className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
            <div className="relative z-10 flex flex-col items-center">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="mb-2 text-xl font-bold tracking-tight text-gray-900">Automate Your Velocity</h3>
              <p className="mb-8 max-w-md text-sm font-medium text-gray-500 leading-relaxed">
                Describe your business process in plain English and watch FlowForge compile it into a visual workflow instantly.
              </p>
              <button
                onClick={() => navigate("/workflows/new")}
                className="group relative overflow-hidden rounded-lg bg-blue-600 px-6 py-3 text-sm font-bold text-white transition-all hover:bg-blue-500 active:scale-[0.98] shadow-sm"
              >
                <span className="relative z-10 flex items-center gap-2">
                  Create Your First Workflow <span className="transition-transform group-hover:translate-x-1">&rarr;</span>
                </span>
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {workflows.map((w) => (
              <button
                key={w.id}
                onClick={() => navigate(`/workflows/${w.id}`)}
                className="group flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-6 text-left transition-all duration-300 hover:border-gray-300 hover:shadow-md"
              >
                <div className="flex w-full items-start justify-between gap-4">
                  <span className="font-bold tracking-tight text-gray-900 line-clamp-1">{w.name}</span>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${STATUS_BADGE[w.status]}`}
                  >
                    {w.status}
                  </span>
                </div>
                {w.description && (
                  <p className="line-clamp-2 text-sm leading-relaxed text-gray-500 font-medium">
                    {w.description}
                  </p>
                )}
                <div className="mt-4 pt-4 border-t border-gray-100">
                  {(() => {
                    const s = stats[w.id];
                    if (!s) return <p className="text-xs font-semibold text-gray-400">No executions yet</p>;
                    return (
                      <div className="flex flex-col gap-1.5">
                        <p className="text-xs font-semibold text-gray-500 flex items-center gap-1">
                          <span className="text-gray-400 font-medium">Last run:</span> {s.lastRunAt ? formatRelativeTime(s.lastRunAt) : "—"} {STATUS_ICON[s.lastStatus ?? ""] ?? ""} <span className="capitalize">{s.lastStatus}</span>
                        </p>
                        <p className="text-xs font-medium text-gray-400">
                          {s.totalExecutions} total execution{s.totalExecutions !== 1 ? "s" : ""}
                        </p>
                      </div>
                    );
                  })()}
                </div>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default DashboardPage;
