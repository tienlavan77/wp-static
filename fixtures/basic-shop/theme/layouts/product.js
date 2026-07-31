export default function productLayout({ components, content, route, html }) {
  return html`
    <main class="product-view">
      <p class="eyebrow">${components.label("product")}</p>
      <h1>${content.title}</h1>
      <p class="description">${content.data.headline ?? content.data.description ?? ""}</p>
      <p class="price">${components.price(content.data.price, content.data.currency)}</p>
      <small class="meta">${route.path}</small>
    </main>
  `;
}
