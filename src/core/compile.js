import createMockAdapter from "../adapters/mockAdapter.js";
import createWordPressAdapter from "../adapters/wordpress/wordpressAdapter.js";
import createWooCommerceAdapter from "../adapters/woocommerce/woocommerceAdapter.js";
import createContentGraph from "../content/createContentGraph.js";
import createRoutes from "../router/createRoutes.js";
import createPluginContext from "../plugins/createPluginContext.js";
import loadPlugins from "../plugins/loadPlugins.js";
import { runPluginHook } from "../plugins/runPluginHook.js";
import filterPublicContents from "../preview/filterPublicContents.js";
import renderPage from "../renderer/renderPage.js";
import resolveTheme from "../theme/resolveTheme.js";

export default async function compile(config, options = {}) {
  const projectDir = config._paths?.projectDir ?? options.projectDir ?? process.cwd();
  const plugins = await loadPlugins(config, {
    cacheBust: options.cacheBust,
    projectDir
  });
  const pluginContext = createPluginContext(config, { projectDir });
  const adapter = createAdapter(config, projectDir);
  const rawContents = await adapter.getContents();
  const rawCollections = typeof adapter.getCollections === "function"
    ? await adapter.getCollections()
    : {};
  const data = await runPluginHook(plugins, "data", {
    collections: rawCollections,
    contents: rawContents
  }, pluginContext);
  const contents = filterPublicContents(data.contents, {
    preview: options.preview
  });
  const collections = data.collections ?? {};
  const graph = createContentGraph({
    contents,
    media: collections.media,
    menus: collections.menus,
    terms: collections.terms
  });
  const routes = await runPluginHook(plugins, "routes", createRoutes(contents, {
    ...config,
    terms: graph.terms.items
  }), pluginContext);
  const theme = await resolveTheme(config, projectDir, {
    cacheBust: options.cacheBust
  });
  const pages = [];

  for (const route of routes) {
    const html = renderPage(route, theme.resolveLayout(route.content), {
      components: theme.components,
      graph,
      site: config.site,
      theme: theme.metadata
    });

    pages.push(await runPluginHook(plugins, "render", {
      html,
      route
    }, {
      ...pluginContext,
      graph
    }));
  }

  return {
    plugins,
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
