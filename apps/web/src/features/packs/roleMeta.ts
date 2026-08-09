const KNOWN: Record<string, { label: string; color: string }> = {
  developer: { label: "Developer", color: "blue" },
  designer: { label: "UI / UX", color: "purple" },
  "ba-po": { label: "BA / PO", color: "gold" },
  product: { label: "Product / BA", color: "gold" },
  qa: { label: "QA", color: "green" },
  ops: { label: "Ops", color: "cyan" },
  marketing: { label: "Marketing", color: "magenta" },
  analyst: { label: "Data Analyst", color: "geekblue" },
  support: { label: "Support", color: "volcano" },
};

const PALETTE = ["blue", "purple", "gold", "green", "cyan", "magenta", "geekblue", "volcano", "lime"];

function titleCase(s: string): string {
  return s
    .split(/[-_\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function roleMeta(role: string): { label: string; color: string } {
  if (KNOWN[role]) {
    return KNOWN[role];
  }
  let hash = 0;
  for (let i = 0; i < role.length; i++) {
    hash = (hash + role.charCodeAt(i)) % PALETTE.length;
  }
  return { label: titleCase(role), color: PALETTE[hash] };
}
