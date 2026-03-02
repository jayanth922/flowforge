import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import type { NodeType, StepStatus } from "../../types/api";

type CustomNodeType = Node<
  { label: string; nodeType: NodeType; stepStatus?: StepStatus },
  "custom"
>;

const NODE_STYLES: Record<
  NodeType,
  { bg: string; border: string; badge: string; icon: string }
> = {
  trigger: {
    bg: "bg-blue-900/50",
    border: "border-blue-500",
    badge: "bg-blue-500/20 text-blue-300",
    icon: "⚡",
  },
  condition: {
    bg: "bg-yellow-900/50",
    border: "border-yellow-500",
    badge: "bg-yellow-500/20 text-yellow-300",
    icon: "◆",
  },
  delay: {
    bg: "bg-orange-900/50",
    border: "border-orange-500",
    badge: "bg-orange-500/20 text-orange-300",
    icon: "⏱",
  },
  notification: {
    bg: "bg-purple-900/50",
    border: "border-purple-500",
    badge: "bg-purple-500/20 text-purple-300",
    icon: "🔔",
  },
  send_email: {
    bg: "bg-green-900/50",
    border: "border-green-500",
    badge: "bg-green-500/20 text-green-300",
    icon: "✉",
  },
  post_slack: {
    bg: "bg-emerald-900/50",
    border: "border-emerald-500",
    badge: "bg-emerald-500/20 text-emerald-300",
    icon: "💬",
  },
  post_discord: {
    bg: "bg-indigo-900/50",
    border: "border-indigo-500",
    badge: "bg-indigo-500/20 text-indigo-300",
    icon: "🎮",
  },
  create_github_issue: {
    bg: "bg-gray-800/50",
    border: "border-gray-500",
    badge: "bg-gray-500/20 text-gray-300",
    icon: "🐙",
  },
  http_request: {
    bg: "bg-cyan-900/50",
    border: "border-cyan-500",
    badge: "bg-cyan-500/20 text-cyan-300",
    icon: "🌐",
  },
  data_transform: {
    bg: "bg-pink-900/50",
    border: "border-pink-500",
    badge: "bg-pink-500/20 text-pink-300",
    icon: "🔀",
  },
};

const STEP_OVERRIDES: Record<StepStatus, string> = {
  pending: "opacity-60",
  running: "animate-[pulse-glow_2s_ease-in-out_infinite] ring-2 ring-purple-500 shadow-[0_0_25px_rgba(168,85,247,0.5)] !border-purple-400 z-10",
  completed: "!bg-green-900/40 !border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.2)]",
  failed: "!bg-red-900/40 !border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.2)]",
  skipped: "opacity-40 !border-dashed !border-gray-600",
};

const STEP_PREFIX: Record<StepStatus, string> = {
  pending: "",
  running: "",
  completed: "✓ ",
  failed: "✗ ",
  skipped: "",
};

const CustomNode = ({ data }: NodeProps<CustomNodeType>) => {
  const nodeType = data.nodeType;
  const style = NODE_STYLES[nodeType];
  const stepStatus = data.stepStatus;
  const override = stepStatus ? STEP_OVERRIDES[stepStatus] : "";
  const prefix = stepStatus ? STEP_PREFIX[stepStatus] : "";

  return (
    <div
      className={`rounded-lg border-2 ${style.border} ${style.bg} px-4 py-3 shadow-lg backdrop-blur-sm ${override}`}
    >
      {nodeType !== "trigger" && (
        <Handle
          type="target"
          position={Position.Left}
          className="!h-3 !w-3 !border-2 !border-gray-400 !bg-gray-700"
        />
      )}

      <div className="flex flex-col items-center gap-1.5">
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${style.badge}`}
        >
          {style.icon} {nodeType}
        </span>
        <span className="text-sm font-semibold text-white">
          {prefix}{data.label}
        </span>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !border-2 !border-gray-400 !bg-gray-700"
      />
    </div>
  );
};

export default CustomNode;
