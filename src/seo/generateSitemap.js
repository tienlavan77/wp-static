export default function generateSitemap(sitePlan, options = {}) {
  const siteUrl = options.site?.url;

  if (!siteUrl) {
    return null;
  }

  const urls = sitePlan.pages.map((page) => {
    const loc = `${siteUrl.replace(/\/+$/, "")}${page.route.path === "/" ? "/" : page.route.path}`;

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
