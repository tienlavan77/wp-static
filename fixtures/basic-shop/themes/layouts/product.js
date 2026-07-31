import {
  createNavItemsFromCategories,
  escapeAttribute,
  escapeText,
  renderBanner,
  renderPageShell,
  renderProductCard,
  renderProductShippingPanel,
  renderProductSpecPanel,
  renderProductSupportPanel,
  renderQuoteTable,
  renderVariantOptions,
  renderServiceStrip
} from "../components/storefrontShell.js";

export default function productLayout({ components, content, graph, html, route }) {
  const categories = createProductCategories(content, graph);
  const breadcrumbs = createProductBreadcrumbs(categories, graph, content.title);
  const navItems = createNavItemsFromCategories(categories);
  const data = content.data ?? {};
  const shortDescription = data.shortDescriptionHtml ?? data.shortDescription ?? data.description ?? "";
  const images = normalizeImages(content);
  const variants = content.variants ?? data.variants ?? [];
  const price = formatProductPrice(data, variants, components);
  const relatedProducts = findRelatedProducts(content, graph).slice(0, 5);
  const viewedProduct = createViewedProductPayload(content, categories, images, price, route);
  const schema = createProductSchema(content, data, variants, categories, breadcrumbs, images, route);
  const banner = renderBanner(html, {
    actions: [
      { href: "/checkout", label: "Đặt hàng ngay" },
      { href: "/lien-he", label: "Nhận báo giá" }
    ],
    description: "Áp dụng cho đơn hàng gửi trực tiếp qua website. Tư vấn nhanh, báo giá rõ ràng.",
    title: "Giảm 10% khi đặt hàng online",
    variant: "home"
  });
  const productImage = images[0]?.src ?? "";
  const body = `
    <section class="storefront-product-detail storefront-container">
      <header class="storefront-product-heading"${productImage ? ` style="--storefront-product-heading-image: url('${escapeStyleUrl(productImage)}')"` : ""}>
        ${productImage ? `<div class="storefront-product-heading__bg" aria-hidden="true"></div>` : ""}
        <nav class="storefront-breadcrumbs" aria-label="Breadcrumb">
          <a href="/">Trang chủ</a>
          ${breadcrumbs.map((item, index) => index === breadcrumbs.length - 1
            ? `<span>${escapeText(item.label)}</span>`
            : `<a href="${escapeAttribute(item.href)}">${escapeText(item.label)}</a>`
          ).join("")}
        </nav>
        <h1>${escapeText(content.title)}</h1>
      </header>

      <div class="storefront-product-detail__grid">
        <div class="storefront-product-gallery">
          ${images.length > 0
            ? `
              <figure class="storefront-product-gallery__main" data-product-gallery-main>
                <button type="button" data-product-gallery-open aria-label="Xem ảnh sản phẩm lớn">
                  <img src="${escapeAttribute(images[0].src)}" alt="${escapeAttribute(images[0].alt || content.title)}" loading="eager" data-product-gallery-image>
                </button>
              </figure>
              ${images.length > 1 ? `
                <div class="storefront-product-gallery__thumbs" data-product-gallery-thumbs>
                  ${images.slice(0, 6).map((image, index) => `
                    <button type="button" data-product-gallery-thumb data-image-src="${escapeAttribute(image.src)}" data-image-alt="${escapeAttribute(image.alt || content.title)}" aria-label="Xem ảnh ${index + 1}" aria-pressed="${index === 0 ? "true" : "false"}">
                      <img src="${escapeAttribute(image.src)}" alt="${escapeAttribute(image.alt || content.title)}" loading="${index === 0 ? "eager" : "lazy"}">
                    </button>
                  `).join("")}
                </div>
              ` : ""}
            `
            : `<div class="storefront-product-gallery__placeholder">${escapeText(content.title)}</div>`}
        </div>

        <article class="storefront-product-summary">
          <p class="storefront-product-price">${escapeText(price)}</p>
          ${shortDescription ? `<div class="storefront-product-short">${shortDescription}</div>` : ""}
          ${variants.length > 0 ? `${renderQuoteTable(variants, data.currency)}${renderVariantOptions(variants)}` : ""}
          ${variants.length > 0 ? `<script type="application/json" data-product-variants>${safeJsonForScript(createVariantPayload(variants, data.currency))}</script>` : ""}
          <div class="storefront-product-actions">
            <input type="number" min="1" value="1" aria-label="Số lượng">
            <button class="storefront-button" type="button" data-add-to-cart data-product-id="${escapeAttribute(content.id)}" data-product-title="${escapeAttribute(content.title)}" data-product-url="${escapeAttribute(route.path)}" data-product-image="${escapeAttribute(productImage)}"${variants.length > 0 ? " disabled" : ""}>Thêm vào giỏ</button>
            <a class="storefront-button-secondary${variants.length > 0 ? " is-disabled" : ""}" href="/lien-he" data-request-quote data-product-id="${escapeAttribute(content.id)}" data-product-title="${escapeAttribute(content.title)}" data-product-url="${escapeAttribute(route.path)}" data-product-image="${escapeAttribute(productImage)}"${variants.length > 0 ? ` aria-disabled="true"` : ""}>Nhận báo giá</a>
          </div>
          <dl class="storefront-product-meta">
            ${data.sku ? `<div><dt>SKU</dt><dd>${escapeText(data.sku)}</dd></div>` : ""}
            ${categories.length > 0 ? `<div><dt>Danh mục</dt><dd>${categories.map((category) => `<a href="${escapeAttribute(category.href)}">${escapeText(category.label)}</a>`).join(", ")}</dd></div>` : ""}
          </dl>
        </article>
      </div>
    </section>

    ${renderServiceStrip()}

    <section class="storefront-section storefront-product-tabs-section">
      <div class="storefront-container">
        <article class="storefront-product-tabs" data-product-tabs>
          <div class="storefront-product-tabs__nav" role="tablist" aria-label="Thông tin sản phẩm">
            <button type="button" role="tab" aria-selected="true" data-product-tab="description">Mô tả sản phẩm</button>
            <button type="button" role="tab" aria-selected="false" data-product-tab="specs">Thông số & đặt in</button>
            <button type="button" role="tab" aria-selected="false" data-product-tab="shipping">Giao hàng & thanh toán</button>
            <button type="button" role="tab" aria-selected="false" data-product-tab="support">Hỏi nhanh</button>
          </div>
          <div class="storefront-product-tabs__panel storefront-prose storefront-product-description" role="tabpanel" data-product-tab-panel="description">
            ${content.content ?? data.description ?? data.shortDescription ?? ""}
          </div>
          <div class="storefront-product-tabs__panel" role="tabpanel" data-product-tab-panel="specs" hidden>
            ${renderProductSpecPanel(content, data, categories)}
          </div>
          <div class="storefront-product-tabs__panel" role="tabpanel" data-product-tab-panel="shipping" hidden>
            ${renderProductShippingPanel()}
          </div>
          <div class="storefront-product-tabs__panel" role="tabpanel" data-product-tab-panel="support" hidden>
            ${renderProductSupportPanel()}
          </div>
        </article>
      </div>
    </section>

    ${relatedProducts.length > 0 ? `
      <section class="storefront-section storefront-related-products">
        <div class="storefront-container">
          <div class="storefront-section__heading storefront-section__heading--inline">
            <h2>Sản phẩm liên quan</h2>
            ${categories[0] ? `<a href="${escapeAttribute(categories[0].href)}">Xem thêm</a>` : ""}
          </div>
          <div class="storefront-product-grid storefront-product-grid--related">
            ${relatedProducts.map((product) => renderProductCard(product, { showCategory: true })).join("")}
          </div>
        </div>
      </section>
    ` : ""}

    <section class="storefront-section storefront-viewed-products" data-recently-viewed-products hidden>
      <div class="storefront-container">
        <div class="storefront-section__heading storefront-section__heading--inline">
          <h2>Sản phẩm đã xem</h2>
          <a href="/shop">Xem thêm sản phẩm</a>
        </div>
        <div class="storefront-product-grid storefront-product-grid--viewed" data-recently-viewed-grid></div>
      </div>
    </section>
    <script type="application/json" data-current-product-viewed>${escapeText(JSON.stringify(viewedProduct))}</script>
    <script type="application/ld+json">${escapeText(JSON.stringify(schema))}</script>
  `;

  return renderPageShell(html, {
    activeHref: categories[0]?.href ?? "/shop",
    banner,
    content: body,
    navItems,
    siteTitle: "Tín Sinh Phát"
  });
}

function createProductSchema(content, data, variants, categories, breadcrumbs, images, route) {
  const productUrl = route.path;
  const numericPrices = variants
    .map((variant) => Number.parseFloat(variant.price ?? variant.salePrice ?? variant.regularPrice))
    .filter(Number.isFinite);
  const fallbackPrice = Number.parseFloat(data.price ?? data.salePrice ?? data.regularPrice);
  const lowPrice = numericPrices.length > 0 ? Math.min(...numericPrices) : fallbackPrice;
  const highPrice = numericPrices.length > 0 ? Math.max(...numericPrices) : fallbackPrice;
  const offers = Number.isFinite(lowPrice)
    ? {
        "@type": "AggregateOffer",
        availability: "https://schema.org/InStock",
        highPrice: Number.isFinite(highPrice) ? highPrice : lowPrice,
        lowPrice,
        offerCount: Math.max(1, variants.length || 1),
        priceCurrency: data.currency ?? "VND",
        url: productUrl
      }
    : undefined;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        brand: {
          "@type": "Brand",
          name: "Tín Sinh Phát"
        },
        category: categories.map((category) => category.label).join(", "),
        description: stripHtml(data.shortDescriptionHtml ?? data.shortDescription ?? data.description ?? content.content ?? ""),
        image: images.map((image) => image.src),
        name: content.title,
        offers,
        sku: data.sku || content.id,
        url: productUrl
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", item: "/", name: "Trang chủ", position: 1 },
          ...breadcrumbs.map((item, index) => ({
            "@type": "ListItem",
            item: item.href || productUrl,
            name: item.label,
            position: index + 2
          }))
        ]
      }
    ]
  };
}

function createViewedProductPayload(content, categories, images, price, route) {
  return {
    category: categories[0]?.label ?? "",
    href: route.path,
    id: content.id,
    image: images[0]?.src ?? "",
    imageAlt: images[0]?.alt ?? content.title,
    price,
    title: content.title,
    viewedAt: Date.now()
  };
}

function createProductCategories(content, graph) {
  const terms = [
    ...(content.taxonomies?.terms ?? []),
    ...(content.data?.categories ?? [])
  ].map((term) => hydrateProductTerm(term, graph));
  const fromProduct = terms.map((term) => ({
    href: term.path ?? `/${term.slug}`,
    label: term.name ?? term.label ?? term.slug,
    term
  })).filter((item) => item.href && item.label);

  if (fromProduct.length > 0) {
    return fromProduct;
  }

  return (graph?.terms?.items ?? [])
    .filter((term) => term.taxonomy === "product_cat")
    .slice(0, 6)
    .map((term) => ({
      href: term.path ?? `/${term.slug}`,
      label: term.name,
      term
    }));
}

function hydrateProductTerm(term, graph) {
  const match = (graph?.terms?.items ?? []).find((candidate) => {
    const sameTaxonomy = !candidate.taxonomy || !term.taxonomy || candidate.taxonomy === term.taxonomy || term.taxonomy === "product_cat";
    const sameId = candidate.id !== undefined && term.id !== undefined && String(candidate.id) === String(term.id);
    const sameSlug = candidate.slug && term.slug && candidate.slug === term.slug;

    return sameTaxonomy && (sameId || sameSlug);
  });

  return match ? { ...match, ...term, parentId: term.parentId ?? match.parentId, parentSlug: term.parentSlug ?? match.parentSlug } : term;
}

function createProductBreadcrumbs(categories, graph, productTitle) {
  const primaryCategory = choosePrimaryCategory(categories, graph);
  const categoryItems = primaryCategory ? createTermBreadcrumbs(primaryCategory.term, graph, primaryCategory.label) : [];

  return [
    ...categoryItems,
    {
      href: "",
      label: productTitle
    }
  ].filter((item) => item.label);
}

function choosePrimaryCategory(categories, graph) {
  if (categories.length <= 1) {
    return categories[0] ?? null;
  }

  return [...categories]
    .sort((a, b) => getTermDepth(b.term, graph) - getTermDepth(a.term, graph))[0];
}

function createTermBreadcrumbs(term, graph, fallbackLabel) {
  const ancestors = findTermAncestors(term, graph);
  const current = {
    href: term.path ?? `/${term.slug}`,
    label: term.name ?? term.label ?? fallbackLabel
  };

  return [
    ...ancestors.map((ancestor) => ({
      href: ancestor.path ?? `/${ancestor.slug}`,
      label: ancestor.name ?? ancestor.label ?? ancestor.slug
    })),
    current
  ].filter((item) => item.href && item.label);
}

function getTermDepth(term, graph) {
  return findTermAncestors(term, graph).length;
}

function findTermAncestors(term, graph) {
  const terms = graph?.terms?.items ?? [];
  const ancestors = [];
  let current = term;
  const seen = new Set();

  while (current) {
    const parent = findParentTerm(current, terms);

    if (!parent) {
      break;
    }

    const key = `${parent.taxonomy ?? ""}:${parent.id ?? parent.slug}`;
    if (seen.has(key)) {
      break;
    }

    ancestors.unshift(parent);
    seen.add(key);
    current = parent;
  }

  return ancestors;
}

function findParentTerm(term, terms) {
  return terms.find((candidate) => {
    const sameTaxonomy = !candidate.taxonomy || !term.taxonomy || candidate.taxonomy === term.taxonomy;
    const sameParentId = term.parentId !== undefined && candidate.id !== undefined && String(term.parentId) === String(candidate.id);
    const sameParentSlug = term.parentSlug && candidate.slug && term.parentSlug === candidate.slug;

    return sameTaxonomy && (sameParentId || sameParentSlug);
  });
}

function normalizeImages(content) {
  const data = content.data ?? {};
  const images = [
    data.featuredImage,
    ...(data.images ?? content.images ?? [])
  ].filter(Boolean);

  if (Array.isArray(images)) {
    return images.map((image) => typeof image === "string"
      ? { src: image }
      : { alt: image.alt, src: image.src ?? image.url ?? image.sourceUrl }
    ).filter((image) => image.src);
  }

  return [];
}

function createVariantPayload(variants, currency = "VND") {
  return variants.map((variant) => ({
    attributes: (variant.attributes ?? []).map((attribute) => ({
      key: attribute.slug ?? attribute.name ?? "",
      label: attribute.name ?? attribute.slug ?? "",
      option: decodeHtmlEntities(attribute.option)
    })),
    currency,
    id: variant.id ?? variant.sku ?? "",
    price: variant.price ?? variant.salePrice ?? variant.regularPrice ?? "",
    priceLabel: formatPrice(variant.price ?? variant.salePrice ?? variant.regularPrice, currency),
    sku: variant.sku ?? ""
  }));
}

function safeJsonForScript(value) {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function decodeHtmlEntities(value) {
  return String(value ?? "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&#8211;/g, "–")
    .replace(/&#8212;/g, "—");
}

function escapeStyleUrl(value) {
  return escapeAttribute(value).replaceAll("'", "\\'");
}

function formatProductPrice(data, variants, components) {
  if (variants.length > 0) {
    const prices = variants
      .map((variant) => Number.parseFloat(variant.price ?? variant.salePrice ?? variant.regularPrice))
      .filter(Number.isFinite);

    if (prices.length > 0) {
      const min = Math.min(...prices);
      const max = Math.max(...prices);

      if (min === max) {
        return formatPrice(min, data.currency);
      }

      return `${formatPrice(min, data.currency)} - ${formatPrice(max, data.currency)}`;
    }
  }

  return components.price(data.price, data.currency) || "Liên hệ";
}

function formatPrice(value, currency = "VND") {
  const number = Number.parseFloat(value);

  if (!Number.isFinite(number)) {
    return "Liên hệ";
  }

  return new Intl.NumberFormat("vi-VN", {
    currency,
    style: "currency"
  }).format(number);
}

function findRelatedProducts(content, graph) {
  const terms = [
    ...(content.data?.terms ?? []),
    ...(content.data?.categories ?? [])
  ].filter((term) => (term.taxonomy ?? "product_cat") === "product_cat");
  const termKeys = new Set(terms.map((term) => `${term.taxonomy ?? "product_cat"}:${term.slug}`));

  return (graph?.contents?.items ?? [])
    .filter((item) => item.type === "product" && item.id !== content.id)
    .filter((item) => (item.data?.terms ?? []).some((term) => termKeys.has(`${term.taxonomy ?? "product_cat"}:${term.slug}`)));
}

function stripHtml(value) {
  return String(value ?? "").replaceAll(/<[^>]*>/g, " ").replaceAll(/\s+/g, " ").trim();
}
