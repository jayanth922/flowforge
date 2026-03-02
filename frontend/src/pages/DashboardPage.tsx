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
  <div className="flex flex-col gap-3 rounded-xl border border-white/5 bg-gray-900/30 p-5 backdrop-blur-sm animate-pulse">
    <div className="flex items-center justify-between">
      <div className="h-5 w-1/2 rounded-md bg-white/10" />
      <div className="h-5 w-14 rounded-full bg-white/10" />
    </div>
    <div className="h-3 w-full rounded bg-white/5 mt-2" />
    <div className="h-3 w-3/4 rounded bg-white/5" />
    <div className="mt-8 h-3 w-24 rounded bg-white/5" />
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
    <div className="min-h-screen bg-gray-950">
      <NavHeader />

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-white">Your Workflows</h2>
            <p className="mt-1 text-sm text-gray-400">Manage and monitor your automated processes.</p>
          </div>
          <button
            onClick={() => navigate("/workflows/new")}
            className="rounded-lg bg-white/10 border border-white/10 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:bg-white/20 hover:shadow-[0_0_15px_rgba(255,255,255,0.1)] active:scale-[0.98]"
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
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gray-900/40 p-12 text-center backdrop-blur-md shadow-2xl">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-blue-500/10 pointer-events-none" />
            <div className="relative z-10 flex flex-col items-center">
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-white/5 border border-white/10 shadow-[0_0_30px_rgba(168,85,247,0.2)]">
                <svg className="h-10 w-10 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="mb-2 text-2xl font-bold tracking-tight text-white">Automate Your Velocity</h3>
              <p className="mb-8 max-w-md text-gray-400 leading-relaxed">
                Describe your business process in plain English and watch FlowForge compile it into a visual workflow instantly.
              </p>
              <button
                onClick={() => navigate("/workflows/new")}
                className="group relative overflow-hidden rounded-xl bg-purple-600 px-8 py-3.5 text-sm font-bold text-white transition-all hover:bg-purple-500 hover:shadow-[0_0_30px_rgba(168,85,247,0.4)] active:scale-[0.98]"
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
                className="group flex flex-col gap-3 rounded-xl border border-white/5 bg-gray-900/40 p-6 text-left backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-white/10 hover:bg-gray-800/60 shadow-lg hover:shadow-purple-500/10"
              >
                <div className="flex w-full items-start justify-between gap-4">
                  <span className="font-bold tracking-tight text-white line-clamp-1">{w.name}</span>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${STATUS_BADGE[w.status]}`}
                  >
                    {w.status}
                  </span>
                </div>
                {w.description && (
                  <p className="line-clamp-2 text-sm leading-relaxed text-gray-400">
                    {w.description}
                  </p>
                )}
                <div className="mt-4 pt-4 border-t border-white/5">
                  {(() => {
                    const s = stats[w.id];
                    if (!s) return <p className="text-xs font-medium text-gray-500">No executions yet</p>;
                    return (
                      <div className="flex flex-col gap-1">
                        <p className="text-xs font-medium text-gray-400">
                          <span className="text-gray-500">Last run:</span> {s.lastRunAt ? formatRelativeTime(s.lastRunAt) : "—"} {STATUS_ICON[s.lastStatus ?? ""] ?? ""} <span className="capitalize">{s.lastStatus}</span>
                        </p>
                        <p className="text-xs font-medium text-gray-500">
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
