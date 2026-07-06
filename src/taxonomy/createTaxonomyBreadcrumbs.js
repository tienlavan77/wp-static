export default function createTaxonomyBreadcrumbs(content, graph) {
  if (!content || !graph?.terms?.items) {
    return [];
  }

  if (content.type?.startsWith?.("archive:")) {
    const term = content.data?.term ?? content.data?.archive?.term;

    return createTermBreadcrumbs(term, graph.terms.items);
  }

  const term = selectPrimaryTerm(content);
  const termBreadcrumbs = createTermBreadcrumbs(term, graph.terms.items);

  if (termBreadcrumbs.length === 0) {
    return [];
  }

  return [
    ...termBreadcrumbs,
    {
      id: content.id,
      label: content.title,
      path: content.slug ? `/${content.slug}` : null,
      slug: content.slug,
      type: content.type
    }
  ];
}

export function createTermBreadcrumbs(term, terms = []) {
  if (!term?.slug) {
    return [];
  }

  return findTermLineage(term, terms).map((item) => ({
    id: item.id,
    label: item.name,
    parentId: item.parentId ?? null,
    path: item.slug ? `/${item.slug}` : null,
    slug: item.slug,
    taxonomy: item.taxonomy,
    type: "term"
  }));
}

function selectPrimaryTerm(content) {
  const terms = content.data?.terms ?? [];

  if (!Array.isArray(terms) || terms.length === 0) {
    return null;
  }

  if (content.type === "product") {
    return terms.find((term) => term.taxonomy === "product_cat") ?? terms[0];
  }

  if (content.type === "post") {
    return terms.find((term) => term.taxonomy === "category") ?? terms[0];
  }

  return terms[0];
}

function findTermLineage(term, terms) {
  const byId = new Map();
  const byKey = new Map();

  for (const item of terms) {
    if (item.id !== undefined && item.id !== null) {
      byId.set(String(item.id), item);
    }

    byKey.set(createTermKey(item), item);
  }

  const lineage = [];
  const seen = new Set();
  let current = byId.get(String(term.id)) ?? byKey.get(createTermKey(term)) ?? term;

  while (current && !seen.has(createSeenKey(current))) {
    seen.add(createSeenKey(current));
    lineage.unshift(current);
    current = findParentTerm(current, byId, byKey);
  }

  return lineage;
}

function findParentTerm(term, byId, byKey) {
  if (term.parentId !== undefined && term.parentId !== null && term.parentId !== 0) {
    return byId.get(String(term.parentId)) ?? null;
  }

  if (term.parentSlug) {
    return byKey.get(`${term.taxonomy}:${term.parentSlug}`) ?? null;
  }

  return null;
}

function createTermKey(term) {
  return `${term.taxonomy ?? term.type ?? ""}:${term.slug ?? ""}`;
}

function createSeenKey(term) {
  return term.id !== undefined && term.id !== null
    ? `id:${term.id}`
    : `key:${createTermKey(term)}`;
}
