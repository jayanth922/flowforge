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
    style: { stroke: "#9ca3af", strokeWidth: 1.5 },
    labelStyle: { fill: "#6b7280", fontSize: 11, fontWeight: 600, letterSpacing: "0.05em" },
    labelBgStyle: { fill: "#ffffff", rx: 4, ry: 4 },
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
      className="bg-gray-50"
      onNodeClick={(_, node) => onNodeClick?.(node.id)}
    >
      <Controls className="!bg-white !border-gray-200 !shadow-sm [&>button]:!bg-white [&>button]:!border-gray-100 [&>button]:!text-gray-600 [&>button:hover]:!bg-gray-50" />
      <Background variant={BackgroundVariant.Dots} color="#d1d5db" gap={24} size={1.5} />
    </ReactFlow>
  );
};

export default WorkflowCanvas;
