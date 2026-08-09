/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        accent: "var(--vcc-accent)",
        "accent-strong": "var(--vcc-accent-strong)",
        accent2: "var(--vcc-accent-2)",
        fg: "var(--vcc-text)",
        surface: "var(--vcc-surface)",
        "surface-2": "var(--vcc-surface-2)",
        line: "var(--vcc-line)",
        muted: "var(--vcc-muted)",
        faint: "var(--vcc-faint)",
        ok: "var(--vcc-ok)",
        warn: "var(--vcc-warn)",
        err: "var(--vcc-err)",
      },
      borderRadius: {
        token: "var(--vcc-radius)",
        "token-lg": "var(--vcc-radius-lg)",
      },
    },
  },
  plugins: [],
};
