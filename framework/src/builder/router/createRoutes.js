import { RouteError } from "../../shared/errors.js";
import createArchiveRoutes from "./createArchiveRoutes.js";
import createSiteRoutePolicy from "../../routing/createSiteRoutePolicy.js";

export default function createRoutes(contents, config = {}) {
  if (!Array.isArray(contents)) {
    throw new RouteError("Router contents must be an array.");
  }

  const policy = config.routingPolicy ?? createSiteRoutePolicy({
    ...config.routing,
    homepage: config.homepage,
    site: config.site
  });
  const terms = config.terms ?? [];

  const contentRoutes = contents.map((content) => createRoute(content, policy));
  const reservedPaths = new Set(contentRoutes.map((route) => route.path));
  const routes = [
    ...contentRoutes,
    ...createArchiveRoutes(contents, terms, {
      ...config,
      reservedPaths
    })
  ];

  assertUniqueRoutePaths(routes);

  return routes;
}

function createRoute(content, policy) {
  const path = policy.resolveContentPath(content);
  const slug = normalizeSlug(path);

  return {
    canonical: policy.createCanonical(path),
    path,
    outputPath: path === "/" ? "index.html" : `${slug}.html`,
    content,
    ...(content.id === "runtime:not-found" || content.type === "not-found" || content.slug === "404" ? { type: "not-found" } : {})
  };
}

function normalizeSlug(slug) {
  if (typeof slug !== "string" || slug.trim() === "") {
    throw new RouteError("Route content slug must be a non-empty string.");
  }

  return slug.trim().replace(/^\/+|\/+$/g, "");
}

function assertUniqueRoutePaths(routes) {
  const routeByPath = new Map();

  for (const route of routes) {
    const existingRoute = routeByPath.get(route.path);

    if (existingRoute) {
      throw new RouteError(
        `Duplicate route "${route.path}" for content "${existingRoute.content.id}" and "${route.content.id}".`
      );
    }

    routeByPath.set(route.path, route);
  }
}
