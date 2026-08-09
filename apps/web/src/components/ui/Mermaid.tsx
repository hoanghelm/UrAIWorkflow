import { useEffect, useState } from "react";
import mermaid from "mermaid";
import { useThemeMode } from "./ThemeProvider";
import { ensureIconPacks } from "./mermaidIcons";

let counter = 0;

export function Mermaid({ code }: { code: string }) {
  const { mode } = useThemeMode();
  const [svg, setSvg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    ensureIconPacks();
    mermaid.initialize({
      startOnLoad: false,
      theme: mode === "dark" ? "dark" : "default",
      securityLevel: "loose",
    });
    counter += 1;
    mermaid
      .render(`mmd-${counter}`, code)
      .then((result) => {
        if (active) {
          setSvg(result.svg);
          setError("");
        }
      })
      .catch((e: unknown) => {
        if (active) {
          setError(e instanceof Error ? e.message : "Invalid diagram");
          setSvg("");
        }
      });
    return () => {
      active = false;
    };
  }, [code, mode]);

  if (error) {
    return <pre className="whitespace-pre-wrap text-xs text-red-500">{error}</pre>;
  }
  return <div className="flex justify-center" dangerouslySetInnerHTML={{ __html: svg }} />;
}
