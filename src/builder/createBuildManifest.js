export default function createBuildManifest(sitePlan, buildResult, options = {}) {
  return {
    version: 1,
    project: {
      name: options.config?.name ?? null
    },
    builtAt: new Date().toISOString(),
    outputDir: buildResult.outputDir,
    pages: sitePlan.pages.length,
    assets: {
      copiedPublicAssets: buildResult.copiedPublicAssets
    },
    routes: sitePlan.pages.map((page) => ({
      path: page.route.path,
      outputPath: page.route.outputPath,
      contentId: page.route.content.id,
      contentType: page.route.content.type,
      title: page.route.content.title
    })),
    contents: sitePlan.routes.map((route) => ({
      id: route.content.id,
      type: route.content.type,
      slug: route.content.slug,
      title: route.content.title,
      route: route.path
    }))
  };
}
