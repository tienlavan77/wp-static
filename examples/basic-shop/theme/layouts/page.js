export default function pageLayout({ components, content, route, html }) {
  return html`
    <main class="page-view">
      <p class="eyebrow">${components.label("page")}</p>
      <h1>${content.title}</h1>
      <p class="description">${content.data.headline ?? content.data.description ?? ""}</p>
      ${renderHomeDemoLinks(route, html)}
      ${renderArchiveLinks(content, html)}
      <small class="meta">${route.path}</small>
    </main>
  `;
}

function renderHomeDemoLinks(route, html) {
  if (route.path !== "/") {
    return "";
  }

  return html.raw([
    '<div class="demo-actions" aria-label="Demo">',
    '<a class="demo-actions__primary" href="/builder.html">Mở Builder demo</a>',
    '<span class="demo-actions__hint">Dùng nút L/D trên header để kiểm tra dark mode.</span>',
    "</div>"
  ].join(""));
}

function renderArchiveLinks(content, html) {
  const links = content.data.archiveLinks ?? [];

  if (!Array.isArray(links) || links.length === 0) {
    return "";
  }

  return html.raw([
    '<nav class="archive-links" aria-label="Danh mục">',
    ...links.map((link) => `<a href="${escapeAttribute(link.href)}">${escapeText(link.label)}</a>`),
    "</nav>"
  ].join(""));
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
