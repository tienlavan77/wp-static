export default function createRouteDependencyGraph(sitePlan = {}) {
  const dependenciesByRoute = new Map();
  // A theme explicitly declares when its Homepage renders catalog cards from
  // the complete graph. Generic themes must not inherit this dependency.
  const homepageProducts = sitePlan.theme?.metadata?.capabilities?.includes("catalog-homepage-products")
    ? (sitePlan.routes ?? [])
      .map((route) => route.content)
      .filter((content) => content?.type === "product")
      .map((content) => ({ id: content.id, slug: content.slug, type: "product" }))
    : [];

  for (const route of sitePlan.routes ?? []) {
    dependenciesByRoute.set(route.path, collectRouteDependencies(route, homepageProducts));
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
    },
    hasRouteFor(change) {
      return [...dependenciesByRoute.values()].some((dependencies) => matchesDependency(change, dependencies));
    }
  };
}

function collectRouteDependencies(route, homepageProducts = []) {
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
    })),
    // Themes, blocks, and collection payloads can embed Product cards below data.
    // Track those references so a Product update rebuilds every rendered card.
    productReferences: [
      ...collectProductReferences(content.data),
      ...(route.path === "/" ? homepageProducts : [])
    ]
  };
}

function collectProductReferences(value, references = [], seen = new Set()) {
  if (!value || typeof value !== "object" || seen.has(value)) return references;
  seen.add(value);
  if (Array.isArray(value)) { for (const entry of value) collectProductReferences(entry, references, seen); return references; }
  const type = normalizeContentType(value.type ?? value.contentType ?? value.objectType);
  const id = value.productId ?? value.product_id ?? (type === "product" ? value.id : null);
  const slug = value.productSlug ?? value.product_slug ?? (type === "product" ? value.slug : null);
  if (id != null || slug) references.push({ id: id == null ? null : String(id), slug: slug == null ? null : String(slug), type: "product" });
  for (const entry of Object.values(value)) collectProductReferences(entry, references, seen);
  return references;
}

function matchesDependency(item, dependencies) {
  if (item.type === "site" || item.type === "theme" || item.type === "menu" || item.type === "media") {
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

  const referencedByRoute = item.type === "product" && dependencies.productReferences.some((reference) => {
    return reference.id === String(item.id) || reference.slug === item.routeSlug;
  });

  return sameContent || sameParentContent || inArchive || referencedByRoute;
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
