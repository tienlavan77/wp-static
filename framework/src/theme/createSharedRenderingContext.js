import deepFreeze from "../shared/deepFreeze.js";
import createSeoMetadata from "../builder/seo/createSeoMetadata.js";

export const RENDERING_CONTEXT_SCHEMA = "wpsc.rendering-context";
export const RENDERING_CONTEXT_VERSION = 1;

export default function createSharedRenderingContext(options = {}) {
  const route = options.route ?? {};
  const content = options.content ?? route.content ?? null;
  const graph = options.graph ?? null;
  const site = cloneRecord(options.site);
  const theme = cloneRecord(options.theme);
  const navigation = options.navigation ?? graph?.menus?.items ?? [];
  const media = options.media ?? graph?.media?.items ?? [];
  const commerce = options.commerce ?? null;
  const account = options.account ?? null;
  const routingPolicy = options.routing ?? null;
  const routing = {
    canonical: route.canonical ?? routingPolicy?.createCanonical?.(route.path) ?? route.path ?? null,
    notFoundPath: routingPolicy?.notFoundPath ?? "/404",
    path: route.path ?? null,
    redirects: routingPolicy?.redirects ?? [],
    type: route.type ?? content?.type ?? null
  };
  const seo = content
    ? createSeoMetadata(content, route, { canonical: routing.canonical, site })
    : {};

  return deepFreeze({
    account,
    commerce,
    content,
    media,
    navigation,
    routing,
    schema: RENDERING_CONTEXT_SCHEMA,
    schemaVersion: RENDERING_CONTEXT_VERSION,
    seo,
    site,
    siteId: options.siteId ?? site.siteId ?? site.id ?? null,
    theme
  });
}

function cloneRecord(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return structuredClone(value);
}
