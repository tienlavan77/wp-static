import path from "node:path";
import { pathToFileURL } from "node:url";
import createMockAdapter from "../adapters/mockAdapter.js";
import createWordPressAdapter from "../adapters/wordpress/wordpressAdapter.js";
import createWooCommerceAdapter from "../adapters/woocommerce/woocommerceAdapter.js";
import createContentGraph from "../content/createContentGraph.js";
import createRoutes from "../router/createRoutes.js";
import renderPage from "../renderer/renderPage.js";

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
  const layout = await loadLayout(config, projectDir);
  const pages = routes.map((route) => ({
    route,
    html: renderPage(route, layout)
  }));

  return {
    routes,
    graph,
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

async function loadLayout(config, projectDir) {
  const layoutPath = config.theme?.layout;

  if (typeof layoutPath !== "string" || layoutPath.trim() === "") {
    throw new Error('Config field "theme.layout" is required.');
  }

  const absolutePath = config._paths?.themeLayout ?? path.resolve(projectDir, layoutPath);
  const module = await import(pathToFileURL(absolutePath).href);

  return module.default;
}
