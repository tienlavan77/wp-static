export default function layout({ components, content, route, html }) {
  return html`
    <main class="fallback-view">
      <p class="eyebrow">${components.label(content.type)}</p>
      <h1>${content.title}</h1>
      <p class="description">${content.data.headline ?? content.data.description ?? ""}</p>
      <small class="meta">${route.path}</small>
    </main>
  `;
}
