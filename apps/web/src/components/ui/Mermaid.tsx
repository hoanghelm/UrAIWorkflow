import { useEffect, useState } from "react";
import mermaid from "mermaid";
import { useThemeMode } from "./ThemeProvider";
import { ensureIconPacks } from "./mermaidIcons";

let counter = 0;

function declaresOwnTheme(code: string): boolean {
  const front = code.match(/^\s*---([\s\S]*?)---/)?.[1] ?? "";
  const init = code.match(/%%\{\s*init\s*:([\s\S]*?)\}\s*%%/i)?.[1] ?? "";
  return /theme/i.test(front) || /theme/i.test(init);
}

export function Mermaid({ code }: { code: string }) {
  const { mode } = useThemeMode();
  const [svg, setSvg] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    ensureIconPacks();
    const src = code.trim();
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "loose",
      ...(declaresOwnTheme(src) ? {} : { theme: mode === "dark" ? "dark" : "default" }),
    });
    counter += 1;
    mermaid
      .render(`mmd-${counter}`, src)
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
