const DEFAULT_ARCHIVE_CONFIG = {
  category: {
    basePath: "",
    contentTypes: ["post", "page"],
    titlePrefix: "Category"
  },
  post_tag: {
    basePath: "",
    contentTypes: ["post", "page"],
    titlePrefix: "Tag"
  },
  product_cat: {
    basePath: "",
    contentTypes: ["product"],
    titlePrefix: "Product Category"
  },
  product_tag: {
    basePath: "",
    contentTypes: ["product"],
    titlePrefix: "Product Tag"
  }
};

const DEFAULT_PAGE_SIZE = 12;

export default function createArchiveRoutes(contents = [], terms = [], config = {}) {
  const archiveConfig = normalizeArchiveConfig(config.archives);
  const reservedPaths = normalizeReservedPaths(config.reservedPaths);
  const descendantsByTermKey = createDescendantsByTermKey(terms);
  const routes = [];

  for (const term of terms) {
    const termConfig = archiveConfig[term.taxonomy];

    if (!termConfig || !term.slug) {
      continue;
    }

    const items = findArchiveItems(contents, term, termConfig, {
      descendantsByTermKey
    });

    if (items.length === 0 && termConfig.includeEmpty !== true) {
      continue;
    }

    routes.push(...createTermArchiveRoutes(term, items, termConfig, {
      reservedPaths
    }));
  }

  return routes;
}

function normalizeArchiveConfig(customConfig = {}) {
  if (customConfig === false) {
    return {};
  }

  const merged = {
    ...DEFAULT_ARCHIVE_CONFIG,
    ...customConfig
  };

  return Object.fromEntries(
    Object.entries(merged).map(([taxonomy, options]) => [
      taxonomy,
      {
        ...options,
        basePath: normalizePathPart(options.basePath),
        contentTypes: normalizeStringArray(options.contentTypes),
        pageSize: normalizePageSize(options.pageSize),
        taxonomy,
        titlePrefix: options.titlePrefix ?? taxonomy
      }
    ])
  );
}

function createTermArchiveRoutes(term, items, termConfig, options = {}) {
  const pageSize = termConfig.pageSize;
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const slug = normalizePathPart(term.slug);
  const basePath = createRoutePath(termConfig.basePath, slug);
  const outputBasePath = createOutputBasePath(termConfig.basePath, slug);
  const routes = [];

  if (options.reservedPaths?.has(basePath)) {
    return routes;
  }

  for (let page = 1; page <= pageCount; page += 1) {
    const pagedItems = items.slice((page - 1) * pageSize, page * pageSize);
    const path = page === 1 ? basePath : `${basePath}/page/${page}`;
    const outputPath = page === 1
      ? `${outputBasePath}.html`
      : `${outputBasePath}/page/${page}.html`;

    routes.push({
      archive: {
        page,
        pageCount,
        pageSize,
        taxonomy: term.taxonomy,
        term
      },
      content: createArchiveContent(term, termConfig, pagedItems, {
        page,
        pageCount,
        path
      }, {
        totalItems: items.length
      }),
      outputPath,
      path,
      type: "archive"
    });
  }

  return routes;
}

function normalizeReservedPaths(value) {
  if (!value) {
    return new Set();
  }

  if (value instanceof Set) {
    return value;
  }

  if (Array.isArray(value)) {
    return new Set(value);
  }

  return new Set();
}

function createArchiveContent(term, termConfig, items, pagination, options = {}) {
  const title = pagination.page === 1
    ? `${termConfig.titlePrefix}: ${term.name}`
    : `${termConfig.titlePrefix}: ${term.name} - Page ${pagination.page}`;
  const description = term.description
    ? createMetaDescription(term.description)
    : `${items.length} sản phẩm trong danh mục ${term.name}.`;

  return {
    id: `archive:${term.taxonomy}:${term.slug}:page:${pagination.page}`,
    type: `archive:${term.taxonomy}`,
    title,
    slug: pagination.path.replace(/^\/+/, ""),
    domain: "archive",
    data: {
      archive: {
        items,
        pagination: {
          ...pagination,
          totalItems: options.totalItems ?? items.length
        },
        taxonomy: term.taxonomy,
        term
      },
      description,
      items,
      pagination: {
        ...pagination,
        totalItems: options.totalItems ?? items.length
      },
      term
    }
  };
}

function createMetaDescription(value) {
  const text = stripHtml(value).replace(/\s+/g, " ").trim();

  if (text.length <= 180) {
    return text;
  }

  return `${text.slice(0, 177).trim()}...`;
}

function stripHtml(value) {
  return String(value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'");
}

function findArchiveItems(contents, term, termConfig, options = {}) {
  const termKeys = new Set([
    createTermKey(term),
    ...(options.descendantsByTermKey?.get(createTermKey(term)) ?? [])
  ]);

  return contents.filter((content) => {
    if (termConfig.contentTypes.length > 0 && !termConfig.contentTypes.includes(content.type)) {
      return false;
    }

    const contentTerms = content.data?.terms ?? [];

    return contentTerms.some((contentTerm) => {
      return termKeys.has(createTermKey(contentTerm));
    });
  });
}

function createDescendantsByTermKey(terms = []) {
  const childrenByParentKey = new Map();
  const descendantsByTermKey = new Map();
  const termById = new Map();
  const termByKey = new Map();

  for (const term of terms) {
    const key = createTermKey(term);

    if (term.id !== undefined && term.id !== null) {
      termById.set(String(term.id), term);
    }

    termByKey.set(key, term);
  }

  for (const term of terms) {
    const parent = findParentTerm(term, { termById, termByKey });

    if (!parent) {
      continue;
    }

    const parentKey = createTermKey(parent);
    const children = childrenByParentKey.get(parentKey) ?? [];
    children.push(createTermKey(term));
    childrenByParentKey.set(parentKey, children);
  }

  for (const term of terms) {
    descendantsByTermKey.set(createTermKey(term), collectDescendantKeys(createTermKey(term), childrenByParentKey));
  }

  return descendantsByTermKey;
}

function collectDescendantKeys(termKey, childrenByParentKey, seen = new Set()) {
  const descendants = [];

  for (const childKey of childrenByParentKey.get(termKey) ?? []) {
    if (seen.has(childKey)) {
      continue;
    }

    seen.add(childKey);
    descendants.push(childKey, ...collectDescendantKeys(childKey, childrenByParentKey, seen));
  }

  return descendants;
}

function findParentTerm(term, indexes) {
  if (term.parentId !== undefined && term.parentId !== null) {
    return indexes.termById.get(String(term.parentId)) ?? null;
  }

  if (term.parentSlug) {
    return indexes.termByKey.get(`${term.taxonomy ?? term.type ?? ""}:${term.parentSlug}`) ?? null;
  }

  return null;
}

function createTermKey(term) {
  return `${term.taxonomy ?? term.type ?? ""}:${term.slug ?? ""}`;
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item) => typeof item === "string" && item.trim() !== "")
    .map((item) => item.trim());
}

function normalizePageSize(value) {
  if (!Number.isInteger(value) || value < 1) {
    return DEFAULT_PAGE_SIZE;
  }

  return value;
}

function normalizePathPart(value) {
  return String(value ?? "")
    .trim()
    .replace(/^\/+|\/+$/g, "");
}

function createRoutePath(basePath, slug) {
  return basePath ? `/${basePath}/${slug}` : `/${slug}`;
}

function createOutputBasePath(basePath, slug) {
  return basePath ? `${basePath}/${slug}` : slug;
}
