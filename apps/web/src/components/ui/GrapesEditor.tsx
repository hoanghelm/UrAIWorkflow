import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import grapesjs, { type Editor } from "grapesjs";
import gjsBlocksBasic from "grapesjs-blocks-basic";
import "grapesjs/dist/css/grapes.min.css";
import "./grapes-editor.css";

export interface GrapesEditorHandle {
  getHtml: () => string;
}

export interface GrapesEditorProps {
  html: string;
}

const STYLE_SECTORS = [
  {
    name: "Dimension",
    open: false,
    properties: ["width", "height", "min-height", "padding", "margin"],
  },
  {
    name: "Layout",
    open: false,
    properties: ["display", "flex-direction", "justify-content", "align-items", "gap"],
  },
  {
    name: "Typography",
    open: false,
    properties: ["font-family", "font-size", "font-weight", "color", "line-height", "text-align"],
  },
  {
    name: "Decorations",
    open: false,
    properties: ["background-color", "border-radius", "border", "box-shadow", "opacity"],
  },
];

function toDocument(css: string, body: string): string {
  return (
    `<!doctype html>\n<html>\n<head>\n<meta charset="utf-8" />\n` +
    `<meta name="viewport" content="width=device-width, initial-scale=1" />\n` +
    `<style>\n${css}\n</style>\n</head>\n<body>\n${body}\n</body>\n</html>\n`
  );
}

function parseDesign(html: string): { css: string; body: string } {
  try {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const css = Array.from(doc.querySelectorAll("style"))
      .map((s) => s.textContent ?? "")
      .join("\n\n");
    const body = doc.body ? doc.body.innerHTML : html;
    return { css, body };
  } catch {
    return { css: "", body: html };
  }
}

export const GrapesEditor = forwardRef<GrapesEditorHandle, GrapesEditorProps>(
  function GrapesEditor({ html }, ref) {
    const canvasRef = useRef<HTMLDivElement>(null);
    const blocksRef = useRef<HTMLDivElement>(null);
    const stylesRef = useRef<HTMLDivElement>(null);
    const layersRef = useRef<HTMLDivElement>(null);
    const traitsRef = useRef<HTMLDivElement>(null);
    const editorRef = useRef<Editor | null>(null);
    const baseCssRef = useRef<string>("");
    const blobUrlRef = useRef<string | null>(null);
    const [tab, setTab] = useState<"styles" | "layers" | "traits">("styles");

    useImperativeHandle(ref, () => ({
      getHtml: () => {
        const editor = editorRef.current;
        if (!editor) {
          return html;
        }
        const combined = `${baseCssRef.current}\n${editor.getCss() ?? ""}`.trim();
        return toDocument(combined, editor.getHtml());
      },
    }));

    useEffect(() => {
      if (!canvasRef.current || !blocksRef.current) {
        return;
      }
      const { css, body } = parseDesign(html);
      baseCssRef.current = css;
      const blobUrl = css ? URL.createObjectURL(new Blob([css], { type: "text/css" })) : null;
      blobUrlRef.current = blobUrl;

      const editor = grapesjs.init({
        container: canvasRef.current,
        height: "100%",
        width: "100%",
        fromElement: false,
        storageManager: false,
        panels: { defaults: [] },
        canvas: { styles: blobUrl ? [blobUrl] : [] },
        blockManager: { appendTo: blocksRef.current },
        selectorManager: { appendTo: stylesRef.current ?? undefined },
        styleManager: { appendTo: stylesRef.current ?? undefined, sectors: STYLE_SECTORS },
        layerManager: { appendTo: layersRef.current ?? undefined },
        traitManager: { appendTo: traitsRef.current ?? undefined },
        plugins: [(ed: Editor) => gjsBlocksBasic(ed, { flexGrid: true })],
      });
      editor.setComponents(body || "<div style=\"padding:24px;color:#888\">Empty design</div>");
      editorRef.current = editor;
      return () => {
        editor.destroy();
        editorRef.current = null;
        if (blobUrlRef.current) {
          URL.revokeObjectURL(blobUrlRef.current);
          blobUrlRef.current = null;
        }
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
      <div className="ge-root">
        <div className="ge-blocks gjs-one-bg gjs-two-color" ref={blocksRef} />
        <div className="ge-canvas" ref={canvasRef} />
        <div className="ge-side gjs-one-bg gjs-two-color">
          <div className="ge-tabs">
            <button
              type="button"
              className={`ge-tab ${tab === "styles" ? "active" : ""}`}
              onClick={() => setTab("styles")}
            >
              Styles
            </button>
            <button
              type="button"
              className={`ge-tab ${tab === "layers" ? "active" : ""}`}
              onClick={() => setTab("layers")}
            >
              Layers
            </button>
            <button
              type="button"
              className={`ge-tab ${tab === "traits" ? "active" : ""}`}
              onClick={() => setTab("traits")}
            >
              Traits
            </button>
          </div>
          <div className="ge-panels">
            <div className={`ge-panel ${tab === "styles" ? "active" : ""}`} ref={stylesRef} />
            <div className={`ge-panel ${tab === "layers" ? "active" : ""}`} ref={layersRef} />
            <div className={`ge-panel ${tab === "traits" ? "active" : ""}`} ref={traitsRef} />
          </div>
        </div>
      </div>
    );
  },
);
