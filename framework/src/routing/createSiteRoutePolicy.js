import deepFreeze from "../shared/deepFreeze.js";

export const SITE_ROUTE_POLICY_SCHEMA = "wpsc.site-route-policy";
export const SITE_ROUTE_POLICY_VERSION = 1;

export default function createSiteRoutePolicy(options = {}) {
  const site = options.site ?? {};
  const homepage = String(options.homepage ?? "home").trim();
  const siteUrl = normalizeSiteUrl(options.siteUrl ?? site.url);
  const notFoundPath = normalizePath(options.notFoundPath ?? "/404");
  const redirects = normalizeRedirects(options.redirects);
  const permalinkConfig = options.permalinks ?? {};

  function resolveContentPath(content = {}) {
    if (isNotFound(content)) return notFoundPath;

    // WordPress owns the actual front-page permalink; config.homepage is only a fallback.
    const sourcePath = options.useSourcePermalinks === false ? null : pathFromUrl(content.data?.link ?? content.data?.permalink);
    if (sourcePath) return normalizePath(sourcePath);

    if (content.slug === homepage) return "/";

    const template = permalinkConfig[content.type] ?? permalinkConfig.default;
    if (typeof template === "string" && template.trim()) {
      return normalizePath(template
        .replaceAll("{type}", String(content.type ?? "page"))
        .replaceAll("{slug}", String(content.slug ?? ""))
        .replaceAll("{year}", datePart(content.data?.date, "year"))
        .replaceAll("{month}", datePart(content.data?.date, "month"))
        .replaceAll("{day}", datePart(content.data?.date, "day")));
    }

    return normalizePath(`/${content.slug ?? ""}`);
  }

  function createCanonical(routePath) {
    return siteUrl ? `${siteUrl}${routePath === "/" ? "/" : routePath}` : routePath;
  }

  function createManifest(routes = []) {
    return deepFreeze({
      notFound: { path: notFoundPath },
      redirects,
      routes: [...routes]
        .map((route) => ({
          canonical: route.canonical ?? createCanonical(route.path),
          contentId: route.content?.id ?? null,
          outputPath: route.outputPath,
          path: route.path,
          type: route.type ?? route.content?.type ?? "content"
        }))
        .sort((first, second) => first.path.localeCompare(second.path)),
      schema: SITE_ROUTE_POLICY_SCHEMA,
      schemaVersion: SITE_ROUTE_POLICY_VERSION,
      siteId: options.siteId ?? site.siteId ?? site.id ?? null,
      siteUrl
    });
  }

  return Object.freeze({ createCanonical, createManifest, notFoundPath, redirects, resolveContentPath, schema: SITE_ROUTE_POLICY_SCHEMA, schemaVersion: SITE_ROUTE_POLICY_VERSION, siteId: options.siteId ?? site.siteId ?? site.id ?? null, siteUrl });
}

function normalizeRedirects(value) {
  const entries = Array.isArray(value)
    ? value.map((item) => [item.from ?? item.source, item])
    : Object.entries(value ?? {});
  const bySource = new Map();

  for (const [source, rule] of entries) {
    const from = normalizePath(source);
    const target = normalizePath(typeof rule === "string" ? rule : rule.to ?? rule.target);
    if (!from || !target || from === target) continue;
    bySource.set(from, { from, status: Number(rule?.status) === 302 ? 302 : 301, to: target });
  }

  return deepFreeze([...bySource.values()].sort((first, second) => first.from.localeCompare(second.from)));
}

function normalizePath(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  const pathname = pathFromUrl(value) ?? value.trim().split(/[?#]/, 1)[0];
  const parts = pathname.replace(/\\/g, "/").split("/").filter(Boolean);
  if (parts.some((part) => part === "." || part === "..")) throw new TypeError("Route paths cannot contain traversal segments.");
  return parts.length === 0 ? "/" : `/${parts.join("/")}`;
}

function pathFromUrl(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value);
    return url.pathname;
  } catch {
    return null;
  }
}

function normalizeSiteUrl(value) {
  if (!value) return null;
  try { return new URL(value).origin; } catch { return null; }
}

function datePart(value, part) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return "";
  if (part === "year") return String(date.getUTCFullYear());
  if (part === "month") return String(date.getUTCMonth() + 1).padStart(2, "0");
  return String(date.getUTCDate()).padStart(2, "0");
}

function isNotFound(content) {
  return content.id === "runtime:not-found" || content.type === "not-found" || content.slug === "404";
}
