import escapeHtml from "../../shared/escapeHtml.js";
import createSeoMetadata from "./createSeoMetadata.js";

export default function renderSeoTags(content, route, options = {}) {
  const metadata = options.metadata ?? createSeoMetadata(content, route, options);
  const tags = [
    `<title>${escapeHtml(metadata.title)}</title>`,
    renderMeta("description", metadata.description),
    renderLink("canonical", metadata.canonical),
    renderMeta("robots", metadata.robots.join(", ")),
    renderProperty("og:title", metadata.openGraph.title),
    renderProperty("og:description", metadata.openGraph.description),
    renderProperty("og:url", metadata.openGraph.url),
    renderProperty("og:type", metadata.openGraph.type),
    renderMeta("twitter:card", metadata.twitter.card),
    renderMeta("twitter:title", metadata.twitter.title),
    renderMeta("twitter:description", metadata.twitter.description)
  ];

  if (metadata.openGraph.image) {
    tags.push(renderProperty("og:image", metadata.openGraph.image));
  }

  if (metadata.twitter.image) {
    tags.push(renderMeta("twitter:image", metadata.twitter.image));
  }

  for (const entry of metadata.structuredData ?? []) {
    tags.push(`<script type="application/ld+json">${serializeJsonLd(entry)}</script>`);
  }

  return tags.filter(Boolean).map((tag) => `    ${tag}`).join("\n");
}

function renderMeta(name, content) {
  if (!content) {
    return null;
  }

  return `<meta name="${escapeHtml(name)}" content="${escapeHtml(content)}">`;
}

function renderProperty(property, content) {
  if (!content) {
    return null;
  }

  return `<meta property="${escapeHtml(property)}" content="${escapeHtml(content)}">`;
}

function renderLink(rel, href) {
  if (!href) {
    return null;
  }

  return `<link rel="${escapeHtml(rel)}" href="${escapeHtml(href)}">`;
}

function serializeJsonLd(value) {
  // Script raw text must remain valid JSON while closing-tag characters stay inert.
  return JSON.stringify(value)
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e")
    .replaceAll("&", "\\u0026")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029");
}
