import { escapeAttribute } from "../shared/html.js";
import { renderProductCard } from "./productCard.js";

export function renderProductGrid(products = [], options = {}) {
  const className = options.className ?? "storefront-product-grid";
  const attributes = options.attributes ?? "";

  return `
    <div class="${escapeAttribute(className)}"${attributes ? ` ${attributes}` : ""}>
      ${products.map((product) => renderProductCard(product, options)).join("")}
    </div>
  `;
}
