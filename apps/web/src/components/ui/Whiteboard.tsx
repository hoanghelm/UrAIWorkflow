import { lazy, Suspense, type ComponentType, type ReactNode } from "react";
import "@excalidraw/excalidraw/index.css";
import { ensureIconPacks } from "./mermaidIcons";

const Excalidraw = lazy(async () => {
  const mod = await import("@excalidraw/excalidraw");
  return { default: mod.Excalidraw as ComponentType<Record<string, unknown>> };
});

export interface WhiteboardScene {
  elements?: unknown[];
  files?: unknown;
  appState?: Record<string, unknown>;
}

export interface WhiteboardProps {
  theme?: "light" | "dark";
  initialData?: WhiteboardScene | null;
  onChange?: (elements: readonly unknown[]) => void;
  fallback?: ReactNode;
}

export function Whiteboard({ theme, initialData, onChange, fallback }: WhiteboardProps) {
  return (
    <Suspense fallback={fallback ?? null}>
      <Excalidraw
        theme={theme}
        initialData={initialData ?? undefined}
        onChange={(els: readonly unknown[]) => onChange?.(els)}
      />
    </Suspense>
  );
}

export async function mermaidToScene(definition: string): Promise<WhiteboardScene> {
  const [{ parseMermaidToExcalidraw }, excalidraw] = await Promise.all([
    import("@excalidraw/mermaid-to-excalidraw"),
    import("@excalidraw/excalidraw"),
  ]);
  const { convertToExcalidrawElements } = excalidraw;
  try {
    const { elements, files } = await parseMermaidToExcalidraw(definition);
    return {
      elements: convertToExcalidrawElements(elements) as unknown[],
      files: files ?? undefined,
      appState: { viewBackgroundColor: "transparent" },
    };
  } catch (shapeError) {
    const scene = await renderAsImage(
      definition,
      convertToExcalidrawElements as unknown as (skeleton: unknown[]) => unknown[],
    );
    if (scene) {
      return scene;
    }
    throw shapeError;
  }
}

function svgSize(svg: string): { width: number; height: number } {
  const vb = svg.match(/viewBox="[\d.]+ [\d.]+ ([\d.]+) ([\d.]+)"/);
  if (vb) {
    return { width: Math.round(Number(vb[1])) || 900, height: Math.round(Number(vb[2])) || 600 };
  }
  return { width: 900, height: 600 };
}

async function renderAsImage(
  definition: string,
  convertToExcalidrawElements: (skeleton: unknown[]) => unknown[],
): Promise<WhiteboardScene | null> {
  try {
    const mermaid = (await import("mermaid")).default;
    ensureIconPacks();
    mermaid.initialize({ startOnLoad: false, securityLevel: "loose" });
    const { svg } = await mermaid.render(`wb-${Date.now()}`, definition);
    const { width, height } = svgSize(svg);
    const dataURL = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
    const fileId = `mmd-${Date.now()}`;
    const elements = convertToExcalidrawElements([
      { type: "image", x: 0, y: 0, width, height, fileId },
    ]);
    return {
      elements,
      files: { [fileId]: { mimeType: "image/svg+xml", id: fileId, dataURL, created: Date.now() } },
      appState: { viewBackgroundColor: "transparent" },
    };
  } catch {
    return null;
  }
}
