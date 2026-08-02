import createRouteDependencyGraph from "../graph/createRouteDependencyGraph.js";
import createInputHash from "../incremental/createInputHash.js";
import createIncrementalArtifactPlan from "./createIncrementalArtifactPlan.js";

export default function planIncrementalBuild(sitePlan, changedItems = [], options = {}) {
  const graph = createRouteDependencyGraph(sitePlan);
  const persistedRoutes = findPersistedAffectedRoutes(changedItems, options.dependencyManifest, sitePlan.routes || []);
  const changedRoutes = persistedRoutes ?? (changedItems.length > 0 ? graph.findAffectedRoutes(changedItems) : []);
  // A deleted item, an incomplete provider payload, or a new dependency that is
  // absent from the current plan cannot be safely incrementally published.
  const requiresFullBuild = changedItems.length === 0
    || (options.requirePersistedDependencyManifest === true && persistedRoutes === null)
    || changedItems.some((item) => !graph.hasRouteFor(item));
  const changedRouteSet = new Set(changedRoutes);
  const affectedPages = changedItems.length > 0
    ? sitePlan.pages.filter((page) => changedRouteSet.has(page.route.path))
    : sitePlan.pages;

  return {
    affectedPages,
    artifactPlan: createIncrementalArtifactPlan({
      allRoutes: sitePlan.routes.map((route) => route.path),
      changedRoutes,
      fullBuild: requiresFullBuild
    }),
    changedItems,
    changedRoutes,
    dependencyGraph: graph.dependenciesByRoute,
    fullBuild: requiresFullBuild,
    inputHash: createInputHash({
      changedItems,
      routes: sitePlan.routes.map((route) => ({
        content: route.content,
        outputPath: route.outputPath,
        path: route.path
      })),
      theme: sitePlan.theme?.metadata ?? null
    })
  };
}

function findPersistedAffectedRoutes(changedItems, manifest, currentRoutes) {
  if (!manifest?.contentToRoutes || typeof manifest.contentToRoutes !== "object") return null;
  const currentRoutePaths = new Set(currentRoutes.map((route) => route.path));
  const routes = new Set();
  for (const item of changedItems) {
    const keys = item.type === "term"
      ? [`term:${item.taxonomy}:${item.id}`, `term:${item.taxonomy}:${item.routeSlug}`]
      : [`${item.type}:${item.id}`, `${item.type}:${item.routeSlug}`];
    const matches = keys.flatMap((key) => manifest.contentToRoutes[key] || []);
    if (matches.length === 0) return null;
    for (const route of matches) {
      // A manifest from an older Site snapshot cannot target a route absent
      // from the current plan; publish a full replacement instead.
      if (!currentRoutePaths.has(route)) return null;
      routes.add(route);
    }
  }
  return [...routes].sort();
}
