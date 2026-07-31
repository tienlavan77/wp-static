export default function createSeoMetadata(content = {}, route = {}, options = {}) {
  const site = options.site ?? {};
  const seo = content.seo ?? {};
  const title = seo.title ?? content.title ?? site.title ?? "";
  // Source excerpts are the editorial summary. Full HTML content is only a fallback.
  const description = createDescription(seo.description
    ?? content.data?.excerpt
    ?? content.data?.shortDescription
    ?? content.data?.description
    ?? site.description
    ?? "");
  // A Route Policy canonical is authoritative; source/provider metadata is descriptive only.
  const canonical = options.canonical ?? absoluteRouteCanonical(route.canonical) ?? seo.canonical ?? createAbsoluteUrl(site.url, route.path);
  const image = seo.openGraph?.image ?? seo.twitter?.image ?? content.data?.featuredImage?.sourceUrl ?? null;

  return {
    title,
    description,
    canonical,
    robots: shouldNotIndex(content, route) ? ["noindex", "follow"] : seo.robots ?? site.robots ?? ["index", "follow"],
    openGraph: {
      title: seo.openGraph?.title ?? title,
      description: seo.openGraph?.description ?? description,
      image,
      url: canonical,
      type: content.type === "product" ? "product" : "website"
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title: seo.twitter?.title ?? title,
      description: seo.twitter?.description ?? description,
      image
    },
    structuredData: options.structuredData ?? createStructuredData(content, {
      canonical,
      description,
      image,
      noindex: shouldNotIndex(content, route),
      title
    })
  };
}

function shouldNotIndex(content, route) {
  const path = String(route.path ?? "").replace(/\/$/, "") || "/";
  const type = String(content.type ?? "").toLowerCase();

  return new Set(["/404", "/account", "/cart", "/checkout", "/search", "/thank-you", "/track-order", "/wishlist"])
    .has(path)
    || ["account", "search"].includes(type)
    || content.id === "runtime:not-found"
    || content.data?.notFoundPage === true;
}

function createDescription(value) {
  const plainText = String(value ?? "")
    // Comments and embedded script/style content must never reach metadata.
    .replaceAll(/<!--[^]*?-->/g, " ")
    .replaceAll(/<(script|style)\b[^>]*>[^]*?<\/\1>/gi, " ")
    .replaceAll(/<[^>]*>/g, " ")
    .replaceAll(/&nbsp;/gi, " ")
    .replaceAll(/&amp;/gi, "&")
    .replaceAll(/&quot;/gi, '"')
    .replaceAll(/&#39;|&apos;/gi, "'")
    .replaceAll(/&lt;/gi, "<")
    .replaceAll(/&gt;/gi, ">")
    .replaceAll(/&#(x[0-9a-f]+|\d+);/gi, decodeNumericEntity)
    .replaceAll(/\s+/g, " ")
    .trim();

  if (plainText.length <= 160) return plainText;

  const boundary = plainText.lastIndexOf(" ", 157);
  return `${plainText.slice(0, boundary > 80 ? boundary : 157).trimEnd()}...`;
}

function decodeNumericEntity(value, entity) {
  const number = entity[0].toLowerCase() === "x"
    ? Number.parseInt(entity.slice(1), 16)
    : Number.parseInt(entity, 10);
  return Number.isFinite(number) ? String.fromCodePoint(number) : value;
}

function createStructuredData(content, metadata) {
  if (metadata.noindex || content.type === "product") return [];

  if (content.type.startsWith("archive:") && isPublicTaxonomyArchive(content.data?.archive?.taxonomy)) {
    return createArchiveStructuredData(content, metadata);
  }

  if (content.type === "post") {
    return [compactJsonLd({
      "@context": "https://schema.org",
      "@type": "Article",
      headline: metadata.title,
      description: metadata.description || undefined,
      mainEntityOfPage: metadata.canonical ? { "@type": "WebPage", "@id": metadata.canonical } : undefined,
      url: metadata.canonical || undefined,
      datePublished: content.data?.date ?? undefined,
      dateModified: content.data?.modified ?? content.data?.date ?? undefined,
      image: metadata.image || undefined,
      author: content.data?.author?.name ? {
        "@type": "Person",
        name: content.data.author.name,
        url: content.data.author.url || undefined
      } : undefined
    })];
  }

  if (content.type === "page") {
    return [compactJsonLd({
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: metadata.title,
      description: metadata.description || undefined,
      url: metadata.canonical || undefined
    })];
  }

  return [];
}

function createArchiveStructuredData(content, metadata) {
  const archive = content.data?.archive ?? {};
  const term = archive.term ?? content.data?.term ?? {};
  const items = archive.items ?? content.data?.items ?? [];
  const taxonomyName = taxonomyLabel(archive.taxonomy);
  const page = compactJsonLd({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: metadata.title,
    description: metadata.description || undefined,
    url: metadata.canonical || undefined,
    about: term.name ? {
      "@type": "DefinedTerm",
      name: term.name,
      inDefinedTermSet: taxonomyName
    } : undefined,
    mainEntity: items.length > 0 ? {
      "@type": "ItemList",
      numberOfItems: items.length
    } : undefined
  });
  const breadcrumb = compactJsonLd({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Trang chủ", item: homepageFromCanonical(metadata.canonical) },
      { "@type": "ListItem", position: 2, name: term.name ?? metadata.title, item: metadata.canonical || undefined }
    ]
  });

  return [page, breadcrumb];
}

function isPublicTaxonomyArchive(taxonomy) {
  return new Set(["category", "post_tag", "product_cat", "product_tag"]).has(taxonomy);
}

function taxonomyLabel(taxonomy) {
  return {
    category: "Category",
    post_tag: "Tag",
    product_cat: "Product category",
    product_tag: "Product tag"
  }[taxonomy] ?? "Archive";
}

function homepageFromCanonical(canonical) {
  if (!canonical) return undefined;
  try {
    return new URL(canonical).origin;
  } catch {
    return "/";
  }
}

function compactJsonLd(value) {
  return Object.fromEntries(Object.entries(value)
    .filter(([, entry]) => entry !== null && entry !== undefined && entry !== ""));
}

function createAbsoluteUrl(baseUrl, routePath) {
  if (!baseUrl) {
    return routePath;
  }

  return `${baseUrl.replace(/\/+$/, "")}${routePath === "/" ? "/" : routePath}`;
}

function absoluteRouteCanonical(value) {
  return typeof value === "string" && /^https?:\/\//i.test(value) ? value : null;
}
