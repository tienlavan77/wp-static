import createRouteDependencyGraph from "../graph/createRouteDependencyGraph.js";
import createInputHash from "../incremental/createInputHash.js";

export default function planIncrementalBuild(sitePlan, changedItems = []) {
  const graph = createRouteDependencyGraph(sitePlan);
  const changedRoutes = changedItems.length > 0
    ? graph.findAffectedRoutes(changedItems)
    : [];
  const changedRouteSet = new Set(changedRoutes);
  const affectedPages = changedItems.length > 0
    ? sitePlan.pages.filter((page) => changedRouteSet.has(page.route.path))
    : sitePlan.pages;

  return {
    affectedPages,
    changedItems,
    changedRoutes,
    dependencyGraph: graph.dependenciesByRoute,
    fullBuild: changedItems.length === 0,
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
