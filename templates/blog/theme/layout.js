export default function layout({ content, route, html }) {
  return html`
    <main>
      <p class="eyebrow">${content.type}</p>
      <h1>${content.title}</h1>
      <p>${content.data.excerpt ?? content.data.description ?? ""}</p>
      <small>${route.path}</small>
    </main>
  `;
}
