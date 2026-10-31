export type TargetSnapshot = {
  status: string;
  publishingMode: string | null;
};

export function aggregateTargets(targets: TargetSnapshot[]) {
  const statuses = targets.map((target) => target.status);
  const modes = new Set(targets.map((target) => target.publishingMode).filter(Boolean));
  let publishingMode: string | null = null;
  if (modes.size === 1) publishingMode = [...modes][0] ?? null;
  if (modes.has("live") && modes.has("simulated")) publishingMode = null;

  if (statuses.length === 0) return { status: "failed", publishingMode };
  if (statuses.every((status) => status === "published")) return { status: "published", publishingMode };
  if (statuses.every((status) => status === "failed")) return { status: "failed", publishingMode };
  if (statuses.some((status) => status === "published") && statuses.some((status) => status === "failed")) {
    return { status: "partial", publishingMode };
  }
  if (statuses.some((status) => status === "publishing")) return { status: "publishing", publishingMode };
  return { status: "failed", publishingMode };
}
