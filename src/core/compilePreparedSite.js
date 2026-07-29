import { stat } from "node:fs/promises";
import createContentGraph from "../content/createContentGraph.js";
import applyAdvancedCommerceData from "../commerce/applyAdvancedCommerceData.js";
import createPluginContext from "../plugins/createPluginContext.js";
import { runPluginHook } from "../plugins/runPluginHook.js";
import filterPublicContents from "../preview/filterPublicContents.js";
import renderPage from "../renderer/renderPage.js";
import createRoutes from "../router/createRoutes.js";
import resolveTemplateForRoute from "../templates/resolveTemplateForRoute.js";
import resolveTheme from "../theme/resolveTheme.js";
import renderLayout from "../visual-builder/renderLayout.js";
import createRuntimeSystemContents from "../runtime/createRuntimeSystemContents.js";

export default async function compilePreparedSite(input = {}, options = {}) {
  const config = input.config || {};
  const projectDir = config._paths?.projectDir || options.projectDir || process.cwd();
  const plugins = input.plugins || [];
  const pluginContext = createPluginContext(config, { projectDir });
  const data = await runPluginHook(plugins, "data", {
    collections: input.collections || {},
    contents: input.contents || []
  }, pluginContext);
  const commerce = applyAdvancedCommerceData(data);
  const sourceContents = filterPublicContents(commerce.contents, { preview: options.preview });
  const contents = options.includeRuntimeSystemRoutes === false
    ? sourceContents
    : createRuntimeSystemContents(sourceContents);
  const collections = commerce.collections || {};
  const graph = createContentGraph({ contents, media: collections.media, menus: collections.menus, terms: collections.terms });
  const routes = await runPluginHook(plugins, "routes", createRoutes(contents, { ...config, terms: graph.terms.items }), pluginContext);
  const theme = await resolveTheme(config, projectDir, { cacheBust: options.cacheBust });
  const rendererFingerprint = await createRendererFingerprint();
  const pages = await Promise.all(routes.map(async (route) => {
    const template = await resolveTemplateForRoute(route, { config, projectDir });
    const layout = template ? createTemplateLayout(route, graph, theme, template, config.site) : theme.resolveLayout(route.content);
    const html = renderPage(route, layout, { components: theme.components, graph, site: config.site, theme: theme.metadata });
    return runPluginHook(plugins, "render", { html, route }, { ...pluginContext, graph });
  }));
  return { cache: { collectionCacheHit: false, contentCacheHit: false, routeRenderCacheHits: 0, routeRenderCacheMisses: routes.length }, graph, pages, plugins, routes, theme };
}

function createTemplateLayout(route, graph, theme, template, site) {
  return ({ html }) => {
    const result = renderLayout(template.raw, { content: route.content, graph, html, route, site, theme });
    return html`<main class="wpsc-template wpsc-template--${template.raw.id || template.scope}" data-template-scope="${template.scope}">${html.raw(result.html)}</main>`;
  };
}

async function createRendererFingerprint() {
  const filePath = new URL("../renderer/renderPage.js", import.meta.url);
  try { const info = await stat(filePath); return { mtimeMs: Math.trunc(info.mtimeMs), path: filePath.pathname, size: info.size }; }
  catch { return { missing: true, path: filePath.pathname }; }
}
