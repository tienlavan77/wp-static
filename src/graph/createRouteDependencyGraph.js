export default function createRouteDependencyGraph(sitePlan = {}) {
  const dependenciesByRoute = new Map();

  for (const route of sitePlan.routes ?? []) {
    dependenciesByRoute.set(route.path, collectRouteDependencies(route));
  }

  return {
    dependenciesByRoute: Object.fromEntries(dependenciesByRoute),
    findAffectedRoutes(changedItems = []) {
      const affected = new Set();

      for (const [routePath, dependencies] of dependenciesByRoute.entries()) {
        if (changedItems.some((item) => matchesDependency(item, dependencies))) {
          affected.add(routePath);
        }
      }

      return [...affected];
    }
  };
}

function collectRouteDependencies(route) {
  const content = route.content ?? {};
  const terms = [
    ...(content.data?.terms ?? []),
    content.data?.term,
    content.archive?.term
  ].filter(Boolean);
  const archiveItems = content.data?.items ?? content.data?.archive?.items ?? [];

  return {
    content: {
      id: content.id ?? null,
      parentId: content.data?.parentProductId ?? null,
      parentSlug: content.data?.parentProductSlug ?? null,
      slug: content.slug ?? null,
      type: normalizeContentType(content.type)
    },
    route: {
      outputPath: route.outputPath,
      path: route.path,
      slug: route.path === "/" ? "" : route.path.replace(/^\/+/, "")
    },
    terms: terms.map((term) => ({
      id: term.id ?? null,
      slug: term.slug ?? null,
      taxonomy: term.taxonomy ?? term.type ?? null
    })),
    archiveItems: archiveItems.map((item) => ({
      id: item.id ?? null,
      slug: item.slug ?? null,
      type: normalizeContentType(item.type)
    }))
  };
}

function matchesDependency(item, dependencies) {
  if (item.type === "theme" || item.type === "menu" || item.type === "media") {
    return true;
  }

  if (item.type === "term") {
    return dependencies.terms.some((term) => {
      const sameTaxonomy = !item.taxonomy || term.taxonomy === item.taxonomy;
      const sameIdentity = term.slug === item.routeSlug || term.id === item.id;

      return sameTaxonomy && sameIdentity;
    });
  }

  const sameContent = dependencies.content.type === item.type
    && (dependencies.content.id === item.id || dependencies.content.slug === item.routeSlug);
  const sameParentContent = item.type === "product"
    && (dependencies.content.parentId === item.id || dependencies.content.parentSlug === item.routeSlug);
  const inArchive = dependencies.archiveItems.some((archiveItem) => {
    return archiveItem.type === item.type
      && (archiveItem.id === item.id || archiveItem.slug === item.routeSlug);
  });

  return sameContent || sameParentContent || inArchive;
}

function normalizeContentType(type) {
  if (typeof type !== "string") {
    return null;
  }

  if (type.startsWith("archive:")) {
    return "term";
  }

  return type;
}
