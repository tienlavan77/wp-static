import { stat } from "node:fs/promises";
import createMockAdapter from "../adapters/mockAdapter.js";
import createWordPressAdapter from "../adapters/wordpress/wordpressAdapter.js";
import createWordPressWooCommerceAdapter from "../adapters/wordpressWooCommerce/wordpressWooCommerceAdapter.js";
import createWooCommerceAdapter from "../adapters/woocommerce/woocommerceAdapter.js";
import createJsonFileCache, { createCacheKey } from "../cache/createJsonFileCache.js";
import createRouteRenderCache from "../cache/createRouteRenderCache.js";
import readThroughCache from "../cache/readThroughCache.js";
import createContentGraph from "../content/createContentGraph.js";
import applyAdvancedCommerceData from "../commerce/applyAdvancedCommerceData.js";
import createRoutes from "../router/createRoutes.js";
import createPluginContext from "../plugins/createPluginContext.js";
import loadPlugins from "../plugins/loadPlugins.js";
import { runPluginHook } from "../plugins/runPluginHook.js";
import filterPublicContents from "../preview/filterPublicContents.js";
import runLimitedParallel from "../performance/runLimitedParallel.js";
import renderPage from "../renderer/renderPage.js";
import resolveTheme from "../theme/resolveTheme.js";

export default async function compile(config, options = {}) {
  const projectDir = config._paths?.projectDir ?? options.projectDir ?? process.cwd();
  const outputDir = config._paths?.outputDir ?? options.outputDir;
  const cacheDir = options.cacheDir ?? (outputDir ? `${outputDir}/.wpsc/cache` : null);
  const stats = {
    contentCacheHit: false,
    collectionCacheHit: false,
    routeRenderCacheHits: 0,
    routeRenderCacheMisses: 0
  };
  const plugins = await loadPlugins(config, {
    cacheBust: options.cacheBust,
    projectDir
  });
  const pluginContext = createPluginContext(config, { projectDir });
  const adapter = createAdapter(config, projectDir);
  const adapterCacheKey = typeof adapter.getCacheKey === "function"
    ? await adapter.getCacheKey()
    : config.adapter;
  const contentCache = createJsonFileCache({
    cacheDir,
    namespace: "content"
  });
  const collectionCache = createJsonFileCache({
    cacheDir,
    namespace: "collections"
  });
  const contentCacheResult = await readThroughCache(
    contentCache,
    createCacheKey({
      adapter: adapterCacheKey,
      cacheVersion: 2,
      kind: "contents"
    }),
    () => adapter.getContents()
  );
  const collectionCacheResult = await readThroughCache(
    collectionCache,
    createCacheKey({
      adapter: adapterCacheKey,
      cacheVersion: 2,
      kind: "collections"
    }),
    () => (typeof adapter.getCollections === "function" ? adapter.getCollections() : {})
  );
  const rawContents = contentCacheResult.value;
  const rawCollections = collectionCacheResult.value;
  stats.contentCacheHit = contentCacheResult.cached;
  stats.collectionCacheHit = collectionCacheResult.cached;
  const data = await runPluginHook(plugins, "data", {
    collections: rawCollections,
    contents: rawContents
  }, pluginContext);
  const commerceData = applyAdvancedCommerceData(data);
  const contents = filterPublicContents(commerceData.contents, {
    preview: options.preview
  });
  const collections = commerceData.collections ?? {};
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
  const rendererFingerprint = await createRendererFingerprint();
  const routeRenderCache = createRouteRenderCache({
    cacheDir
  });
  const pages = await runLimitedParallel(routes, async (route) => {
    const html = await renderRoute(route, {
      config,
      graph,
      rendererFingerprint,
      routeRenderCache,
      stats,
      theme
    });

    return runPluginHook(plugins, "render", {
      html,
      route
    }, {
      ...pluginContext,
      graph
    });
  }, {
    concurrency: options.renderConcurrency
  });

  return {
    cache: stats,
    plugins,
    routes,
    graph,
    theme,
    pages
  };
}

async function renderRoute(route, context) {
  const cacheKey = route.path === "/"
    ? null
    : context.routeRenderCache?.createKey(route, {
      ...context.theme.metadata,
      renderer: context.rendererFingerprint
    });
  const cachedHtml = cacheKey ? await context.routeRenderCache.get(cacheKey) : null;

  if (cachedHtml !== null) {
    context.stats.routeRenderCacheHits += 1;
    return cachedHtml;
  }

  context.stats.routeRenderCacheMisses += 1;
  const html = renderPage(route, context.theme.resolveLayout(route.content), {
    components: context.theme.components,
    graph: context.graph,
    site: context.config.site,
    theme: context.theme.metadata
  });

  if (cacheKey) {
    await context.routeRenderCache.set(cacheKey, html);
  }

  return html;
}

async function createRendererFingerprint() {
  const filePath = new URL("../renderer/renderPage.js", import.meta.url);

  try {
    const info = await stat(filePath);

    return {
      mtimeMs: Math.trunc(info.mtimeMs),
      path: filePath.pathname,
      size: info.size
    };
  } catch {
    return {
      missing: true,
      path: filePath.pathname
    };
  }
}

function createAdapter(config, projectDir) {
  if (config.adapter?.type !== "mock") {
    if (config.adapter?.type === "wordpress") {
      return createWordPressAdapter(config.adapter);
    }

    if (config.adapter?.type === "woocommerce") {
      return createWooCommerceAdapter(config.adapter);
    }

    if (config.adapter?.type === "wordpressWooCommerce") {
      return createWordPressWooCommerceAdapter(config.adapter);
    }

    throw new Error(`Unsupported adapter type "${config.adapter?.type}".`);
  }

  return createMockAdapter({
    source: config.adapter.source,
    baseDir: config._paths?.projectDir ?? projectDir
  });
}
