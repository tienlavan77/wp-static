import { escapeAttribute, escapeText } from "../shared/html.js";

export function renderBreadcrumbs(items = []) {
  return `
    <nav class="storefront-breadcrumbs" aria-label="Breadcrumb">
      ${items.map((item, index) => item.href && index < items.length - 1
        ? `<a href="${escapeAttribute(item.href)}">${escapeText(item.label)}</a>`
        : `<span>${escapeText(item.label)}</span>`
      ).join("")}
    </nav>
  `;
}
