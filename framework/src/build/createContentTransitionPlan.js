function pathFrom(value) {
  if (!value) return null;
  try { return new URL(value).pathname; } catch { return `/${String(value).replace(/^\/+|\/+$/g, "")}`; }
}

export default function createContentTransitionPlan(changes = []) {
  const destructive = changes.filter((change) => ["delete", "unpublish"].includes(change?.changeType));
  const redirects = changes.flatMap((change) => {
    if (change?.changeType !== "update" && change?.changeType !== "publish") return [];
    const from = pathFrom(change.previousUrl || change.previousSlug);
    const to = pathFrom(change.url || change.slug);
    return from && to && from !== to ? [{ from, status: 301, to }] : [];
  });
  const rename = redirects.length > 0;
  return Object.freeze({
    destructive: destructive.length > 0,
    forceFullBuild: destructive.length > 0 || rename,
    redirects: Object.freeze(redirects),
    reason: destructive.length > 0 ? "destructive-source-change" : rename ? "route-rename" : null
  });
}
