export default function createContentValidationReport(sitePlan = {}) {
  const routes = sitePlan.routes ?? [];
  const contents = sitePlan.graph?.contents?.items ?? routes.map((route) => route.content).filter(Boolean);
  const issues = [
    ...findMissingSlugs(contents),
    ...findRouteCollisions(routes)
  ];

  return {
    issueCount: issues.length,
    issues,
    ok: issues.length === 0,
    routeCount: routes.length
  };
}

function findMissingSlugs(contents) {
  return contents
    .filter((content) => typeof content.slug !== "string" || content.slug.trim() === "")
    .map((content) => ({
      code: "missing-slug",
      id: content.id ?? null,
      message: `Content "${content.id ?? "unknown"}" is missing a slug.`,
      severity: "error"
    }));
}

function findRouteCollisions(routes) {
  const seen = new Map();
  const issues = [];

  for (const route of routes) {
    const existingRoute = seen.get(route.path);

    if (existingRoute) {
      issues.push({
        code: "duplicate-route",
        message: `Route "${route.path}" is used by "${existingRoute.content?.id}" and "${route.content?.id}".`,
        path: route.path,
        severity: "error"
      });
    } else {
      seen.set(route.path, route);
    }
  }

  return issues;
}
