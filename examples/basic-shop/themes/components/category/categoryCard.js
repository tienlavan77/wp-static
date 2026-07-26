import { escapeAttribute, escapeText } from "../shared/html.js";

export function renderCategoryCard(category, options = {}) {
  const label = category.label ?? category.name ?? category.title ?? category.slug ?? "";
  const href = category.href ?? category.path ?? `/${category.slug}`;
  const count = category.countLabel ?? formatProductCount(category.count ?? 0);
  const cta = options.cta ?? "";

  return `
    <a class="storefront-category-card" href="${escapeAttribute(href)}">
      <span class="storefront-category-card__media">
        ${category.image ? `<img src="${escapeAttribute(category.image)}" alt="${escapeAttribute(label)}" loading="lazy">` : `<span>${escapeText(label.slice(0, 1))}</span>`}
      </span>
      <span class="storefront-category-card__body">
        <strong>${escapeText(label)}</strong>
        <small>${escapeText(count)}</small>
        ${cta ? `<em>${escapeText(cta)}</em>` : ""}
      </span>
    </a>
  `;
}

function formatProductCount(count) {
  return `${count} sản phẩm`;
}
