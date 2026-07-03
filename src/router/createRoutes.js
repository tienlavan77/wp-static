export default function createRoutes(contents, config = {}) {
  if (!Array.isArray(contents)) {
    throw new Error("Router contents must be an array.");
  }

  const homepage = config.homepage ?? "home";

  const routes = contents.map((content) => createRoute(content, homepage));

  assertUniqueRoutePaths(routes);

  return routes;
}

function createRoute(content, homepage) {
  const slug = normalizeSlug(content.slug);

  if (slug === homepage) {
    return {
      path: "/",
      outputPath: "index.html",
      content
    };
  }

  return {
    path: `/${slug}`,
    outputPath: `${slug}.html`,
    content
  };
}

function normalizeSlug(slug) {
  if (typeof slug !== "string" || slug.trim() === "") {
    throw new Error("Route content slug must be a non-empty string.");
  }

  return slug.trim().replace(/^\/+|\/+$/g, "");
}

function assertUniqueRoutePaths(routes) {
  const routeByPath = new Map();

  for (const route of routes) {
    const existingRoute = routeByPath.get(route.path);

    if (existingRoute) {
      throw new Error(
        `Duplicate route "${route.path}" for content "${existingRoute.content.id}" and "${route.content.id}".`
      );
    }

    routeByPath.set(route.path, route);
  }
}
