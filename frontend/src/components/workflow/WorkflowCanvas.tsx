import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  type Node,
  type Edge,
} from "@xyflow/react";
import type { DAGNode, DAGEdge } from "../../types/api";
import CustomNode from "./CustomNode";

interface WorkflowCanvasProps {
  nodes: DAGNode[];
  edges: DAGEdge[];
}

const nodeTypes = { custom: CustomNode } as const;

const toFlowNodes = (dagNodes: DAGNode[]): Node[] =>
  dagNodes.map((n) => ({
    id: n.id,
    type: "custom" as const,
    position: n.position,
    data: { label: n.label, nodeType: n.type },
  }));

const toFlowEdges = (dagEdges: DAGEdge[]): Edge[] =>
  dagEdges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label,
    animated: true,
    style: { stroke: "#6b7280" },
    labelStyle: { fill: "#9ca3af", fontSize: 12 },
  }));

const WorkflowCanvas = ({ nodes, edges }: WorkflowCanvasProps) => {
  if (nodes.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-lg text-gray-500">
          Describe a workflow to get started
        </p>
      </div>
    );
  }

  return (
    <ReactFlow
      nodes={toFlowNodes(nodes)}
      edges={toFlowEdges(edges)}
      nodeTypes={nodeTypes}
      fitView
      proOptions={{ hideAttribution: true }}
      className="bg-gray-900"
    >
      <Controls className="!bg-gray-800 !border-gray-700 !shadow-lg [&>button]:!bg-gray-800 [&>button]:!border-gray-700 [&>button]:!text-gray-300 [&>button:hover]:!bg-gray-700" />
      <Background variant={BackgroundVariant.Dots} color="#374151" gap={20} />
    </ReactFlow>
  );
};

export default WorkflowCanvas;
