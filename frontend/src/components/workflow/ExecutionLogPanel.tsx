import type { ExecutionStep, ExecutionStatusResponse } from "../../types/api";

interface ExecutionLogPanelProps {
  steps: ExecutionStep[];
  status: ExecutionStatusResponse["status"] | null;
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-gray-600/30 text-gray-300",
  running: "bg-blue-600/30 text-blue-300",
  completed: "bg-green-600/30 text-green-300",
  failed: "bg-red-600/30 text-red-300",
  skipped: "bg-gray-600/30 text-gray-500",
};

const STATUS_DOT: Record<string, string> = {
  pending: "bg-gray-500",
  running: "bg-blue-400 animate-pulse",
  completed: "bg-green-400",
  failed: "bg-red-400",
  skipped: "bg-gray-600",
};

const formatDuration = (start: string, end: string | null): string => {
  if (!end) return "...";
  const ms = new Date(end).getTime() - new Date(start).getTime();
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
};

const truncateOutput = (output: Record<string, unknown>): string => {
  const str = JSON.stringify(output);
  if (str.length <= 60) return str;
  return str.slice(0, 57) + "...";
};

const ExecutionLogPanel = ({ steps, status }: ExecutionLogPanelProps) => {
  if (!status) {
    return (
      <div className="border-t border-gray-800 bg-gray-950 px-4 py-4">
        <p className="text-center text-sm text-gray-600">
          Run the workflow to see execution steps here
        </p>
      </div>
    );
  }

  return (
    <div className="border-t border-gray-800 bg-gray-950">
      <div className="flex items-center justify-between px-4 py-2">
        <span className="text-sm font-semibold text-gray-300">
          Execution Log
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[status] ?? ""}`}
        >
          {status}
        </span>
      </div>

      <div className="max-h-[180px] overflow-y-auto px-4 pb-3">
        {steps.length === 0 ? (
          <p className="text-sm text-gray-600">Waiting for execution data...</p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {steps.map((step) => (
              <div
                key={step.stepId}
                className="flex items-center gap-3 rounded-lg bg-gray-900/50 px-3 py-2 text-sm"
              >
                <span
                  className={`h-2.5 w-2.5 shrink-0 rounded-full ${STATUS_DOT[step.status] ?? ""}`}
                />

                <span className="w-32 shrink-0 font-medium text-gray-200">
                  {step.stepLabel}
                </span>

                <span
                  className={`shrink-0 rounded px-1.5 py-0.5 text-xs ${STATUS_STYLES[step.status] ?? ""}`}
                >
                  {step.status}
                </span>

                <span className="shrink-0 text-xs text-gray-500">
                  {formatDuration(step.startedAt, step.completedAt)}
                </span>

                {step.retryCount > 0 && (
                  <span className="shrink-0 text-xs text-yellow-500">
                    {step.retryCount} {step.retryCount === 1 ? "retry" : "retries"}
                  </span>
                )}

                {step.error && (
                  <span className="truncate text-xs text-red-400">
                    {step.error}
                  </span>
                )}

                {step.status === "completed" && (
                  <span className="truncate text-xs text-gray-600">
                    {truncateOutput(step.output)}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExecutionLogPanel;
