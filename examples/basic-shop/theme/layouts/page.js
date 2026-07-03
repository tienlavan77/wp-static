export default function pageLayout({ components, content, route, html }) {
  return html`
    <main class="page-view">
      <p class="eyebrow">${components.label("page")}</p>
      <h1>${content.title}</h1>
      <p class="description">${content.data.headline ?? content.data.description ?? ""}</p>
      <small class="meta">${route.path}</small>
    </main>
  `;
}
