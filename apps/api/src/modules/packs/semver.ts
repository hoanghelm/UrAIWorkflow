export function compareSemver(a: string, b: string): number {
  const [coreA, preA = ""] = a.split("-");
  const [coreB, preB = ""] = b.split("-");
  const pa = coreA.split(".").map((n) => Number(n) || 0);
  const pb = coreB.split(".").map((n) => Number(n) || 0);
  for (let i = 0; i < 3; i += 1) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) {
      return diff;
    }
  }
  if (preA === preB) {
    return 0;
  }
  if (!preA) {
    return 1;
  }
  if (!preB) {
    return -1;
  }
  return preA < preB ? -1 : 1;
}
