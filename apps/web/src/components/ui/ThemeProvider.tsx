import { ConfigProvider, theme } from "antd";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type Mode = "light" | "dark";

interface ThemeContextValue {
  mode: Mode;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({ mode: "light", toggle: () => undefined });

export function useThemeMode() {
  return useContext(ThemeContext);
}

function initialMode(): Mode {
  const saved = typeof localStorage !== "undefined" ? localStorage.getItem("vcc-theme") : null;
  if (saved === "light" || saved === "dark") {
    return saved;
  }
  if (typeof matchMedia !== "undefined" && matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>(initialMode);

  useEffect(() => {
    localStorage.setItem("vcc-theme", mode);
    document.documentElement.classList.toggle("dark", mode === "dark");
  }, [mode]);

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, toggle: () => setMode((m) => (m === "dark" ? "light" : "dark")) }),
    [mode],
  );

  return (
    <ThemeContext.Provider value={value}>
      <ConfigProvider
        theme={{
          algorithm: mode === "dark" ? theme.darkAlgorithm : theme.defaultAlgorithm,
          token: { colorPrimary: "#E8734A", borderRadius: 8 },
          components: {
            Menu: {
              itemHeight: 34,
              itemMarginBlock: 2,
              subMenuItemBg: "transparent",
              collapsedWidth: 56,
            },
          },
        }}
      >
        {children}
      </ConfigProvider>
    </ThemeContext.Provider>
  );
}
