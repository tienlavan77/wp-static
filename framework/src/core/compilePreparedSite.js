import { stat } from "node:fs/promises";
import createContentGraph from "../builder/content/createContentGraph.js";
import applyAdvancedCommerceData from "../commerce/applyAdvancedCommerceData.js";
import createPluginContext from "../plugins/createPluginContext.js";
import { runPluginHook } from "../plugins/runPluginHook.js";
import filterPublicContents from "../preview/filterPublicContents.js";
import renderPage from "../builder/renderer/renderPage.js";
import createRoutes from "../builder/router/createRoutes.js";
import resolveTemplateForRoute from "../builder/templates/resolveTemplateForRoute.js";
import resolveTheme from "../builder/theme/resolveTheme.js";
import renderLayout from "../builder/visual-builder/renderLayout.js";
import createRuntimeSystemContents from "../runtime/bootstrap/createRuntimeSystemContents.js";
import createSiteRoutePolicy from "../routing/createSiteRoutePolicy.js";

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
  const routing = createSiteRoutePolicy({ ...config.routing, homepage: config.homepage, site: config.site });
  const routes = await runPluginHook(plugins, "routes", createRoutes(contents, { ...config, routingPolicy: routing, terms: graph.terms.items }), pluginContext);
  const theme = await resolveTheme(config, projectDir, { cacheBust: options.cacheBust });
  const rendererFingerprint = await createRendererFingerprint();
  const pages = await Promise.all(routes.map(async (route) => {
    const template = await resolveTemplateForRoute(route, { config, projectDir });
    const layout = template ? createTemplateLayout(route, graph, theme, template, config.site) : theme.resolveLayout(route.content);
    const html = renderPage(route, layout, { components: theme.components, graph, routing, site: config.site, theme: theme.metadata });
    return runPluginHook(plugins, "render", { html, route }, { ...pluginContext, graph });
  }));
  return { cache: { collectionCacheHit: false, contentCacheHit: false, routeRenderCacheHits: 0, routeRenderCacheMisses: routes.length }, graph, pages, plugins, routes, routing, theme };
}

function createTemplateLayout(route, graph, theme, template, site) {
  return ({ context, html }) => {
    const result = renderLayout(template.raw, { content: context.content, graph, html, route, site: context.site, theme });
    return html`<main class="wpsc-template wpsc-template--${template.raw.id || template.scope}" data-template-scope="${template.scope}">${html.raw(result.html)}</main>`;
  };
}

async function createRendererFingerprint() {
  const filePath = new URL("../builder/renderer/renderPage.js", import.meta.url);
  try { const info = await stat(filePath); return { mtimeMs: Math.trunc(info.mtimeMs), path: filePath.pathname, size: info.size }; }
  catch { return { missing: true, path: filePath.pathname }; }
}
