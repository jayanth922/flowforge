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
    bg: "bg-blue-50",
    border: "border-blue-200",
    badge: "bg-blue-100 text-blue-700",
    icon: "⚡",
  },
  condition: {
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    badge: "bg-yellow-100 text-yellow-700",
    icon: "◆",
  },
  delay: {
    bg: "bg-orange-50",
    border: "border-orange-200",
    badge: "bg-orange-100 text-orange-700",
    icon: "⏱",
  },
  notification: {
    bg: "bg-purple-50",
    border: "border-purple-200",
    badge: "bg-purple-100 text-purple-700",
    icon: "🔔",
  },
  send_email: {
    bg: "bg-green-50",
    border: "border-green-200",
    badge: "bg-green-100 text-green-700",
    icon: "✉",
  },
  post_slack: {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    badge: "bg-emerald-100 text-emerald-700",
    icon: "💬",
  },
  post_discord: {
    bg: "bg-indigo-50",
    border: "border-indigo-200",
    badge: "bg-indigo-100 text-indigo-700",
    icon: "🎮",
  },
  create_github_issue: {
    bg: "bg-gray-50",
    border: "border-gray-300",
    badge: "bg-gray-200 text-gray-700",
    icon: "🐙",
  },
  http_request: {
    bg: "bg-cyan-50",
    border: "border-cyan-200",
    badge: "bg-cyan-100 text-cyan-700",
    icon: "🌐",
  },
  data_transform: {
    bg: "bg-pink-50",
    border: "border-pink-200",
    badge: "bg-pink-100 text-pink-700",
    icon: "🔀",
  },
};

const STEP_OVERRIDES: Record<StepStatus, string> = {
  pending: "opacity-60",
  running: "ring-2 ring-blue-500 shadow-md !border-blue-400 z-10",
  completed: "!bg-green-50 !border-green-400 shadow-sm",
  failed: "!bg-red-50 !border-red-400 shadow-sm",
  skipped: "opacity-40 border-dashed !border-gray-300",
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
      className={`rounded-lg border-2 ${style.border} ${style.bg} px-4 py-3 shadow-sm ${override}`}
    >
      {nodeType !== "trigger" && (
        <Handle
          type="target"
          position={Position.Left}
          className="!h-3 !w-3 !border-2 !border-gray-300 !bg-white"
        />
      )}

      <div className="flex flex-col items-center gap-1.5">
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${style.badge}`}
        >
          {style.icon} {nodeType}
        </span>
        <span className="text-sm font-bold text-gray-900">
          {prefix}{data.label}
        </span>
      </div>

      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !border-2 !border-gray-300 !bg-white"
      />
    </div>
  );
};

export default CustomNode;
