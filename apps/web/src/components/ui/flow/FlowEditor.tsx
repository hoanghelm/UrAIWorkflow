import { useCallback } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Edge,
  type Node,
  type OnEdgesChange,
  type OnNodesChange,
  type OnSelectionChangeParams,
  type XYPosition,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useThemeMode } from "../ThemeProvider";

export type { Connection, Edge, Node, XYPosition };

export const NODE_DRAG_TYPE = "application/vcc-node";

export function useFlowGraph(initialNodes: Node[], initialEdges: Edge[]) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const onConnect = useCallback(
    (connection: Connection) =>
      setEdges((current) => addEdge({ ...connection, animated: true }, current)),
    [setEdges],
  );
  return { nodes, edges, setNodes, setEdges, onNodesChange, onEdgesChange, onConnect };
}

interface FlowEditorProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: (connection: Connection) => void;
  onSelect?: (id: string | null) => void;
  onDropNode?: (kind: string, position: XYPosition) => void;
  readOnly?: boolean;
}

function FlowInner({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onSelect,
  onDropNode,
  readOnly,
}: FlowEditorProps) {
  const { mode } = useThemeMode();
  const { screenToFlowPosition } = useReactFlow();

  const handleSelection = useCallback(
    (params: OnSelectionChangeParams) => {
      onSelect?.(params.nodes[0]?.id ?? null);
    },
    [onSelect],
  );

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      if (readOnly) {
        return;
      }
      const kind = event.dataTransfer.getData(NODE_DRAG_TYPE);
      if (!kind || !onDropNode) {
        return;
      }
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      onDropNode(kind, position);
    },
    [onDropNode, screenToFlowPosition],
  );

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  return (
    <div className="h-full w-full" onDrop={handleDrop} onDragOver={handleDragOver}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onSelectionChange={handleSelection}
        nodesDraggable={!readOnly}
        nodesConnectable={!readOnly}
        edgesFocusable={!readOnly}
        colorMode={mode}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background />
        <Controls />
        <MiniMap pannable zoomable />
      </ReactFlow>
    </div>
  );
}

export function FlowEditor(props: FlowEditorProps) {
  return (
    <ReactFlowProvider>
      <FlowInner {...props} />
    </ReactFlowProvider>
  );
}
