import createSeoMetadata from "./createSeoMetadata.js";

export default function generateSitemap(sitePlan, options = {}) {
  const siteUrl = options.site?.url;

  if (!siteUrl) {
    return null;
  }

  const urls = [...new Set(sitePlan.pages
    .filter((page) => !createSeoMetadata(page.route?.content, page.route, { site: options.site }).robots.includes("noindex"))
    .map((page) => {
      const route = page.route ?? {};
      const policyCanonical = options.routePolicy?.createCanonical?.(route.path);
      const loc = policyCanonical
        ?? (typeof route.canonical === "string" && /^https?:\/\//i.test(route.canonical) ? route.canonical : null)
        ?? `${siteUrl.replace(/\/+$/, "")}${route.path === "/" ? "/" : route.path}`;
      return loc;
    }))]
    .sort((first, second) => first.localeCompare(second))
    .map((loc) => {

    return [
      "  <url>",
      `    <loc>${escapeXml(loc)}</loc>`,
      "  </url>"
    ].join("\n");
    });

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls,
    "</urlset>"
  ].join("\n");
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
