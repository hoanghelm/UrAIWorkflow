import { ReactFlow, Background, Controls, type Edge, type Node } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useThemeMode } from "../ThemeProvider";

export type { Edge, Node };

interface CanvasProps {
  nodes: Node[];
  edges: Edge[];
  onNodeClick?: (id: string) => void;
  onPaneClick?: () => void;
}

export function Canvas({ nodes, edges, onNodeClick, onPaneClick }: CanvasProps) {
  const { mode } = useThemeMode();
  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        colorMode={mode}
        fitView
        proOptions={{ hideAttribution: true }}
        onNodeClick={(_, node) => onNodeClick?.(node.id)}
        onPaneClick={() => onPaneClick?.()}
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}
