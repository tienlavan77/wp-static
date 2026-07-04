export default function pageLayout({ components, content, route, html }) {
  return html`
    <main class="page-view">
      <p class="eyebrow">${components.label("page")}</p>
      <h1>${content.title}</h1>
      <p class="description">${content.data.headline ?? content.data.description ?? ""}</p>
      ${renderArchiveLinks(content, html)}
      <small class="meta">${route.path}</small>
    </main>
  `;
}

function renderArchiveLinks(content, html) {
  const links = content.data.archiveLinks ?? [];

  if (!Array.isArray(links) || links.length === 0) {
    return "";
  }

  return html.raw(html`
    <nav class="archive-links" aria-label="Danh mục">
      ${links.map((link) => html.raw(`<a href="${escapeAttribute(link.href)}">${escapeText(link.label)}</a>`))}
    </nav>
  `);
}

function escapeAttribute(value) {
  return escapeText(value).replaceAll('"', "&quot;");
}

function escapeText(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
