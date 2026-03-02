import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  type Node,
  type Edge,
} from "@xyflow/react";
import type { DAGNode, DAGEdge, StepStatus } from "../../types/api";
import CustomNode from "./CustomNode";

interface WorkflowCanvasProps {
  nodes: DAGNode[];
  edges: DAGEdge[];
  stepStatuses?: Map<string, StepStatus>;
  onNodeClick?: (nodeId: string) => void;
}

const nodeTypes = { custom: CustomNode } as const;

const toFlowNodes = (
  dagNodes: DAGNode[],
  stepStatuses?: Map<string, StepStatus>,
): Node[] =>
  dagNodes.map((n) => ({
    id: n.id,
    type: "custom" as const,
    position: n.position,
    data: {
      label: n.label,
      nodeType: n.type,
      stepStatus: stepStatuses?.get(n.id),
    },
  }));

const toFlowEdges = (dagEdges: DAGEdge[]): Edge[] =>
  dagEdges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label,
    animated: true,
    style: { stroke: "#a855f7", strokeWidth: 2, filter: "drop-shadow(0 0 4px rgba(168,85,247,0.4))" },
    labelStyle: { fill: "#e5e7eb", fontSize: 11, fontWeight: 600, letterSpacing: "0.05em" },
    labelBgStyle: { fill: "rgba(17,17,17,0.8)", rx: 4, ry: 4 },
    labelBgPadding: [6, 4],
  }));

const WorkflowCanvas = ({
  nodes,
  edges,
  stepStatuses,
  onNodeClick,
}: WorkflowCanvasProps) => {
  if (nodes.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-lg text-gray-400 font-medium">
          Describe a workflow to get started
        </p>
      </div>
    );
  }

  return (
    <ReactFlow
      nodes={toFlowNodes(nodes, stepStatuses)}
      edges={toFlowEdges(edges)}
      nodeTypes={nodeTypes}
      fitView
      proOptions={{ hideAttribution: true }}
      className="bg-transparent"
      onNodeClick={(_, node) => onNodeClick?.(node.id)}
    >
      <Controls className="!bg-gray-900/80 !border-white/10 !shadow-lg backdrop-blur-md [&>button]:!bg-transparent [&>button]:!border-white/5 [&>button]:!text-gray-300 [&>button:hover]:!bg-white/10" />
      <Background variant={BackgroundVariant.Dots} color="rgba(255,255,255,0.1)" gap={24} size={2} />
    </ReactFlow>
  );
};

export default WorkflowCanvas;
