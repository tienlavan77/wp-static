import { escapeAttribute } from "../shared/html.js";
import { renderCategoryCard } from "./categoryCard.js";

export function renderCategoryGrid(categories = [], options = {}) {
  const className = options.className ?? "storefront-category-grid";

  return `
    <div class="${escapeAttribute(className)}">
      ${categories.map((category) => renderCategoryCard(category, options)).join("")}
    </div>
  `;
}
