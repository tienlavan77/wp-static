import { formatProductPrice, getProductSortPrice } from "../shared/format.js";
import { escapeAttribute, escapeText } from "../shared/html.js";
import { normalizeImageUrl } from "../shared/image.js";

export function renderProductCard(product, options = {}) {
  const href = product.path ?? `/${product.slug}`;
  const image = normalizeImageUrl(product.image ?? product.data?.featuredImage ?? product.data?.image ?? product.data?.images?.[0]);
  const price = formatProductPrice(product);
  const sortPrice = getProductSortPrice(product);
  const sortDate = product.date ?? product.data?.date ?? product.data?.createdAt ?? "";
  const category = options.showCategory ? findProductCategory(product) : null;

  return `
    <article class="storefront-product-card" data-product-card data-sort-price="${escapeAttribute(sortPrice)}" data-sort-date="${escapeAttribute(sortDate)}">
      <a class="storefront-product-card__link" href="${escapeAttribute(href)}">
        <div class="storefront-product-card__media">
          ${image ? `<img src="${escapeAttribute(image)}" alt="${escapeAttribute(product.title)}" loading="lazy">` : `<span>${escapeText(product.title)}</span>`}
        </div>
        <div class="storefront-product-card__body">
          ${category ? `<span class="storefront-product-card__category">${escapeText(category)}</span>` : ""}
          <h3>${escapeText(product.title)}</h3>
          ${price ? `<strong>${escapeText(price)}</strong>` : ""}
        </div>
      </a>
    </article>
  `;
}

function findProductCategory(product) {
  const terms = [
    ...(product.data?.terms ?? []),
    ...(product.data?.categories ?? [])
  ];
  const category = terms.find((term) => (term.taxonomy ?? "product_cat") === "product_cat");

  return category?.name ?? category?.label ?? "";
}
