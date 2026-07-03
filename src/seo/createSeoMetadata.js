export default function createSeoMetadata(content, route, options = {}) {
  const site = options.site ?? {};
  const seo = content.seo ?? {};
  const title = seo.title ?? content.title ?? site.title ?? "";
  const description = seo.description
    ?? content.data?.description
    ?? content.data?.excerpt
    ?? site.description
    ?? "";
  const canonical = seo.canonical ?? createAbsoluteUrl(site.url, route.path);
  const image = seo.openGraph?.image ?? seo.twitter?.image ?? content.data?.featuredImage?.sourceUrl ?? null;

  return {
    title,
    description,
    canonical,
    robots: seo.robots ?? site.robots ?? ["index", "follow"],
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
    }
  };
}

function createAbsoluteUrl(baseUrl, routePath) {
  if (!baseUrl) {
    return routePath;
  }

  return `${baseUrl.replace(/\/+$/, "")}${routePath === "/" ? "/" : routePath}`;
}
