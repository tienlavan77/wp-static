export default function layout({ content, route, html }) {
  const price = formatPrice(content.data.price, content.data.currency);

  return html`
    <main class="${content.type === "product" ? "product-view" : "page-view"}">
      <p>${content.type}</p>
      <h1>${content.title}</h1>
      <p>${content.data.headline ?? content.data.description ?? ""}</p>
      <p class="price">${price}</p>
      <small>${route.path}</small>
    </main>
  `;
}

function formatPrice(price, currency) {
  if (typeof price !== "number") {
    return "";
  }

  return new Intl.NumberFormat("vi-VN", {
    currency: currency ?? "VND",
    style: "currency"
  }).format(price);
}
