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
  const routes = [];

  for (const term of terms) {
    const termConfig = archiveConfig[term.taxonomy];

    if (!termConfig || !term.slug) {
      continue;
    }

    const items = findArchiveItems(contents, term, termConfig);

    if (items.length === 0 && termConfig.includeEmpty !== true) {
      continue;
    }

    routes.push(...createTermArchiveRoutes(term, items, termConfig));
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

function createTermArchiveRoutes(term, items, termConfig) {
  const pageSize = termConfig.pageSize;
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const slug = normalizePathPart(term.slug);
  const basePath = createRoutePath(termConfig.basePath, slug);
  const outputBasePath = createOutputBasePath(termConfig.basePath, slug);
  const routes = [];

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
      }),
      outputPath,
      path,
      type: "archive"
    });
  }

  return routes;
}

function createArchiveContent(term, termConfig, items, pagination) {
  const title = pagination.page === 1
    ? `${termConfig.titlePrefix}: ${term.name}`
    : `${termConfig.titlePrefix}: ${term.name} - Page ${pagination.page}`;

  return {
    id: `archive:${term.taxonomy}:${term.slug}:page:${pagination.page}`,
    type: `archive:${term.taxonomy}`,
    title,
    slug: pagination.path.replace(/^\/+/, ""),
    domain: "archive",
    data: {
      archive: {
        items,
        pagination,
        taxonomy: term.taxonomy,
        term
      },
      description: `${items.length} item(s) in ${term.name}.`,
      items,
      pagination,
      term
    }
  };
}

function findArchiveItems(contents, term, termConfig) {
  return contents.filter((content) => {
    if (termConfig.contentTypes.length > 0 && !termConfig.contentTypes.includes(content.type)) {
      return false;
    }

    const contentTerms = content.data?.terms ?? [];

    return contentTerms.some((contentTerm) => {
      const sameSlug = contentTerm.slug === term.slug;
      const sameTaxonomy = (contentTerm.taxonomy ?? contentTerm.type) === term.taxonomy;

      return sameSlug && sameTaxonomy;
    });
  });
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
