export default function generateRobotsTxt(options = {}) {
  const siteUrl = options.site?.url;
  const rules = options.site?.robotsTxt ?? [
    "User-agent: *",
    "Allow: /"
  ];

  if (siteUrl) {
    return [...rules, `Sitemap: ${siteUrl.replace(/\/+$/, "")}/sitemap.xml`, ""].join("\n");
  }

  return [...rules, ""].join("\n");
}
