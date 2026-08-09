import mermaid from "mermaid";

let registered = false;

export function ensureIconPacks() {
  if (registered) {
    return;
  }
  registered = true;
  mermaid.registerIconPacks([
    { name: "logos", loader: () => import("@iconify-json/logos").then((m) => m.icons) },
  ]);
}
