import {
  ReactFlow,
  Controls,
  Background,
  BackgroundVariant,
  MiniMap,
  type Node,
  type Edge,
} from "@xyflow/react";
import type { DAGNode, DAGEdge, StepStatus } from "../../types/api";
import CustomNode from "./CustomNode";

interface WorkflowCanvasProps {
  nodes: DAGNode[];
  edges: DAGEdge[];
  stepStatuses?: Map<string, StepStatus>;
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
    style: { stroke: "#6b7280" },
    labelStyle: { fill: "#9ca3af", fontSize: 12 },
  }));

const WorkflowCanvas = ({
  nodes,
  edges,
  stepStatuses,
}: WorkflowCanvasProps) => {
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
      nodes={toFlowNodes(nodes, stepStatuses)}
      edges={toFlowEdges(edges)}
      nodeTypes={nodeTypes}
      fitView
      proOptions={{ hideAttribution: true }}
      className="bg-gray-900"
    >
      <Controls className="!bg-gray-800 !border-gray-700 !shadow-lg [&>button]:!bg-gray-800 [&>button]:!border-gray-700 [&>button]:!text-gray-300 [&>button:hover]:!bg-gray-700" />
      <Background variant={BackgroundVariant.Dots} color="#374151" gap={20} />
      <MiniMap
        nodeColor="#374151"
        nodeBorderRadius={4}
        maskColor="rgba(0,0,0,0.5)"
        className="!bg-gray-900 !border-gray-700"
      />
    </ReactFlow>
  );
};

export default WorkflowCanvas;
