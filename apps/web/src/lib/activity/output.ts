export interface OutputLine {
  at: string;
  level: string;
  message: string;
}

const MAX = 500;
let lines: Record<string, OutputLine[]> = {};
const subs = new Set<() => void>();
const emit = () => subs.forEach((fn) => fn());

function append(runId: string, line: OutputLine) {
  const current = lines[runId] ?? [];
  lines = { ...lines, [runId]: [...current, line].slice(-MAX) };
  emit();
}

function get(runId: string): OutputLine[] {
  return lines[runId] ?? [];
}

function seed(runId: string, seeded: OutputLine[]) {
  lines = { ...lines, [runId]: seeded.slice(-MAX) };
  emit();
}

export const outputStore = {
  append,
  get,
  seed,
  subscribe: (fn: () => void) => {
    subs.add(fn);
    return () => subs.delete(fn);
  },
  getSnapshot: () => lines,
};
