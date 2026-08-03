const GLOBAL_ARTIFACTS = Object.freeze([
  "adminApp",
  "assetManifest",
  "contentStore",
  "mediaManifest",
  "robots",
  "routeManifest",
  "searchIndex",
  "sitemap",
  "templateManifest",
  "buildManifest",
  "runtimeAssets",
  "staticAssets"
]);

export default function createIncrementalArtifactPlan(input = {}) {
  const fullBuild = input.fullBuild !== false;
  const routes = fullBuild ? input.allRoutes || [] : input.changedRoutes || [];
  const uniqueRoutes = [...new Set(routes)].sort();
  return Object.freeze({
    fullBuild,
    global: Object.freeze({
      artifacts: Object.freeze([...GLOBAL_ARTIFACTS]),
      reason: fullBuild
        ? "full-build"
        : "global derived artifacts require a complete Site view for correctness"
    }),
    media: Object.freeze({
      routes: Object.freeze([...uniqueRoutes]),
      strategy: fullBuild ? "site-wide" : "affected-route-assets"
    }),
    routes: Object.freeze({
      fragments: Object.freeze([...uniqueRoutes]),
      html: Object.freeze([...uniqueRoutes]),
      routeData: Object.freeze([...uniqueRoutes]),
      serveAliases: Object.freeze([...uniqueRoutes])
    })
  });
}
