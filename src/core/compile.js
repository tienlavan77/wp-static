import createMockAdapter from "../adapters/mockAdapter.js";
import createWordPressAdapter from "../adapters/wordpress/wordpressAdapter.js";
import createWooCommerceAdapter from "../adapters/woocommerce/woocommerceAdapter.js";
import createContentGraph from "../content/createContentGraph.js";
import createRoutes from "../router/createRoutes.js";
import renderPage from "../renderer/renderPage.js";
import resolveTheme from "../theme/resolveTheme.js";

export default async function compile(config, options = {}) {
  const projectDir = config._paths?.projectDir ?? options.projectDir ?? process.cwd();
  const adapter = createAdapter(config, projectDir);
  const contents = await adapter.getContents();
  const collections = typeof adapter.getCollections === "function"
    ? await adapter.getCollections()
    : {};
  const graph = createContentGraph({
    contents,
    media: collections.media,
    menus: collections.menus,
    terms: collections.terms
  });
  const routes = createRoutes(contents, config);
  const theme = await resolveTheme(config, projectDir, {
    cacheBust: options.cacheBust
  });
  const pages = routes.map((route) => ({
    route,
    html: renderPage(route, theme.resolveLayout(route.content), {
      components: theme.components,
      graph,
      site: config.site,
      theme: theme.metadata
    })
  }));

  return {
    routes,
    graph,
    theme,
    pages
  };
}

function createAdapter(config, projectDir) {
  if (config.adapter?.type !== "mock") {
    if (config.adapter?.type === "wordpress") {
      return createWordPressAdapter(config.adapter);
    }

    if (config.adapter?.type === "woocommerce") {
      return createWooCommerceAdapter(config.adapter);
    }

    throw new Error(`Unsupported adapter type "${config.adapter?.type}".`);
  }

  return createMockAdapter({
    source: config.adapter.source,
    baseDir: config._paths?.projectDir ?? projectDir
  });
}
