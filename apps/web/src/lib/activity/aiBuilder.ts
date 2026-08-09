export interface AiBuilderTarget {
  label: string;
  open: () => void;
}

let target: AiBuilderTarget | null = null;
const subs = new Set<() => void>();
const emit = () => subs.forEach((fn) => fn());

export const aiBuilderStore = {
  set(next: AiBuilderTarget) {
    target = next;
    emit();
  },
  clear() {
    target = null;
    emit();
  },
  subscribe: (fn: () => void) => {
    subs.add(fn);
    return () => subs.delete(fn);
  },
  getSnapshot: () => target,
};
