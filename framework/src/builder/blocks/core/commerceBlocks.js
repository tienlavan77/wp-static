export const headingBlock = {
  name: "core/heading",
  label: "Heading",
  category: "content",
  props: {
    level: {
      default: 2,
      label: "Level",
      type: "number"
    },
    text: {
      label: "Text",
      required: true,
      type: "string"
    }
  },
  bindings: {},
  render({ html, props }) {
    const level = Math.min(6, Math.max(1, Math.trunc(props.level)));

    return html.raw(`<h${level}>${escapeHtml(props.text)}</h${level}>`);
  }
};

export const contentTextBlock = {
  name: "core/content-text",
  label: "Content Text",
  category: "content",
  props: {
    fallback: {
      default: "",
      label: "Fallback",
      type: "string"
    }
  },
  bindings: {
    text: {
      fallback: "",
      path: "data.description",
      source: "content"
    }
  },
  render({ bindings, html, props }) {
    return html`<p class="block-text">${bindings.text || props.fallback}</p>`;
  }
};

export const siteLogoBlock = {
  name: "site/logo",
  label: "Site Logo",
  category: "site",
  props: {
    href: {
      default: "/",
      label: "Href",
      type: "string"
    },
    text: {
      default: "",
      label: "Text",
      type: "string"
    }
  },
  bindings: {
    siteTitle: {
      fallback: "",
      path: "title",
      source: "site"
    }
  },
  render({ bindings, html, props }) {
    const label = props.text || bindings.siteTitle;

    if (!label) {
      return "";
    }

    return html.raw(`<a class="wpsc-site-logo" href="${escapeAttribute(normalizeHref(props.href))}">${escapeHtml(label)}</a>`);
  }
};

export const siteNavBlock = {
  name: "site/nav",
  label: "Site Navigation",
  category: "site",
  props: {
    ariaLabel: {
      default: "Primary",
      label: "Aria Label",
      type: "string"
    },
    items: {
      default: [],
      label: "Items",
      type: "array"
    }
  },
  bindings: {},
  render({ html, props }) {
    const items = Array.isArray(props.items) ? props.items : [];

    if (items.length === 0) {
      return "";
    }

    return html.raw([
      `<nav class="wpsc-site-nav" aria-label="${escapeAttribute(props.ariaLabel)}">`,
      ...items.map((item) => `<a href="${escapeAttribute(normalizeHref(item.href))}">${escapeHtml(item.label)}</a>`),
      "</nav>"
    ].join(""));
  }
};

export const darkModeToggleBlock = {
  name: "site/dark-mode-toggle",
  label: "Dark Mode Toggle",
  category: "site",
  props: {
    label: {
      default: "Đổi giao diện sáng tối",
      label: "Label",
      type: "string"
    }
  },
  bindings: {},
  render({ html, props }) {
    return html.raw(renderDarkModeToggleHtml(props.label));
  }
};

export const siteHeaderBlock = {
  name: "site/header",
  label: "Site Header",
  category: "site",
  props: {
    logoHref: {
      default: "/",
      label: "Logo Href",
      type: "string"
    },
    logoText: {
      default: "",
      label: "Logo Text",
      type: "string"
    },
    navItems: {
      default: [],
      label: "Nav Items",
      type: "array"
    },
    rows: {
      default: [],
      label: "Rows",
      type: "array"
    },
    showDarkMode: {
      default: true,
      label: "Show Dark Mode",
      type: "boolean"
    }
  },
  bindings: {
    siteTitle: {
      fallback: "",
      path: "title",
      source: "site"
    }
  },
  render({ bindings, html, props }) {
    const logoText = props.logoText || bindings.siteTitle;
    const navItems = Array.isArray(props.navItems) ? props.navItems : [];
    const rows = Array.isArray(props.rows) ? props.rows : [];

    return html.raw([
      '<header class="wpsc-site-header">',
      rows.length > 0
        ? renderHeaderRows(rows, {
          logoHref: props.logoHref,
          logoText,
          navItems,
          showDarkMode: props.showDarkMode
        })
        : renderLegacyHeader({ logoHref: props.logoHref, logoText, navItems, showDarkMode: props.showDarkMode }),
      "</header>"
    ].join(""));
  }
};

export const productPriceBlock = {
  name: "commerce/product-price",
  label: "Product Price",
  category: "commerce",
  props: {
    currency: {
      default: "VND",
      label: "Currency",
      type: "string"
    }
  },
  bindings: {
    price: {
      fallback: null,
      path: "data.price",
      source: "content"
    }
  },
  render({ bindings, html, props }) {
    if (typeof bindings.price !== "number") {
      return "";
    }

    return html`<p class="price">${formatPrice(bindings.price, props.currency)}</p>`;
  }
};

export const archiveLinksBlock = {
  name: "commerce/archive-links",
  label: "Archive Links",
  category: "commerce",
  props: {
    label: {
      default: "Danh mục",
      label: "Label",
      type: "string"
    }
  },
  bindings: {
    links: {
      fallback: [],
      path: "data.archiveLinks",
      source: "content"
    }
  },
  render({ bindings, html, props }) {
    const links = Array.isArray(bindings.links) ? bindings.links : [];

    if (links.length === 0) {
      return "";
    }

    return html.raw([
      `<nav class="archive-links" aria-label="${escapeAttribute(props.label)}">`,
      ...links.map((link) => `<a href="${escapeAttribute(link.href)}">${escapeHtml(link.label)}</a>`),
      "</nav>"
    ].join(""));
  }
};

export const productListBlock = {
  name: "commerce/product-list",
  label: "Product List",
  category: "commerce",
  props: {
    columns: {
      default: 3,
      label: "Columns",
      type: "number"
    },
    limit: {
      default: 6,
      label: "Limit",
      type: "number"
    },
    title: {
      default: "Sản phẩm nổi bật",
      label: "Title",
      type: "string"
    }
  },
  bindings: {
    productIds: {
      fallback: [],
      path: "data.featuredProductIds",
      source: "content"
    }
  },
  render({ bindings, context, html, props }) {
    const products = resolveProducts(bindings.productIds, context)
      .slice(0, Math.max(1, Math.trunc(props.limit)));

    if (products.length === 0) {
      return "";
    }

    const columns = Math.min(4, Math.max(1, Math.trunc(props.columns)));

    return html.raw([
      `<section class="wpsc-product-list wpsc-product-list--cols-${columns}">`,
      `<div class="wpsc-product-list__header"><h2>${escapeHtml(props.title)}</h2></div>`,
      `<div class="wpsc-product-list__grid">`,
      ...products.map(renderProductCard),
      "</div>",
      "</section>"
    ].join(""));
  }
};

const coreCommerceBlocks = [
  headingBlock,
  contentTextBlock,
  siteLogoBlock,
  siteNavBlock,
  darkModeToggleBlock,
  siteHeaderBlock,
  productPriceBlock,
  archiveLinksBlock,
  productListBlock
];

export default coreCommerceBlocks;

function formatPrice(value, currency) {
  return new Intl.NumberFormat("vi-VN", {
    currency,
    style: "currency"
  }).format(value);
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll('"', "&quot;");
}

function resolveProducts(productIds, context = {}) {
  const ids = Array.isArray(productIds) ? productIds : [];
  const graph = context.graph;

  if (ids.length > 0 && typeof graph?.findContentById === "function") {
    return ids
      .map((id) => graph.findContentById(id))
      .filter((content) => content?.type === "product");
  }

  if (typeof graph?.findContentsByType === "function") {
    return graph.findContentsByType("product");
  }

  return [];
}

function renderProductCard(product) {
  const data = product.data ?? {};
  const href = `/${String(product.slug ?? "").replace(/^\/+|\/+$/g, "")}`;
  const description = data.shortDescription ?? data.excerpt ?? data.description ?? "";
  const price = typeof data.price === "number"
    ? `<p class="wpsc-product-card__price">${formatPrice(data.price, data.currency ?? "VND")}</p>`
    : "";

  return [
    `<article class="wpsc-product-card">`,
    `<a class="wpsc-product-card__link" href="${escapeAttribute(href)}">`,
    `<h3>${escapeHtml(product.title)}</h3>`,
    description ? `<p>${escapeHtml(description)}</p>` : "",
    price,
    "</a>",
    "</article>"
  ].join("");
}

function renderDarkModeToggleHtml(label) {
  return [
    `<button class="theme-toggle" type="button" aria-label="${escapeAttribute(label)}" aria-pressed="false" title="${escapeAttribute(label)}">`,
    `<span class="theme-toggle__sun" aria-hidden="true">L</span>`,
    `<span class="theme-toggle__moon" aria-hidden="true">D</span>`,
    "</button>",
    "<script>",
    "(function(){",
    "var button=document.currentScript.previousElementSibling;",
    "if(!button)return;",
    "function applyTheme(theme){document.documentElement.dataset.theme=theme;localStorage.setItem(\"wpsc-theme\",theme);button.setAttribute(\"aria-pressed\",theme===\"dark\"?\"true\":\"false\");}",
    "applyTheme(document.documentElement.dataset.theme||\"light\");",
    "button.addEventListener(\"click\",function(){applyTheme(document.documentElement.dataset.theme===\"dark\"?\"light\":\"dark\");});",
    "}());",
    "</script>"
  ].join("");
}

function renderLegacyHeader(options) {
  return [
    options.logoText ? `<a class="wpsc-site-logo" href="${escapeAttribute(normalizeHref(options.logoHref))}">${escapeHtml(options.logoText)}</a>` : "",
    options.navItems.length > 0
      ? [
        '<nav class="wpsc-site-nav" aria-label="Primary">',
        ...options.navItems.map((item) => `<a href="${escapeAttribute(normalizeHref(item.href))}">${escapeHtml(item.label)}</a>`),
        "</nav>"
      ].join("")
      : "",
    options.showDarkMode ? renderDarkModeToggleHtml("Đổi giao diện sáng tối") : ""
  ].join("");
}

function renderHeaderRows(rows, context) {
  return rows.map((row, rowIndex) => {
    const columns = Array.isArray(row.columns) ? row.columns : [];

    return [
      `<div class="wpsc-site-header__row" data-header-row="${rowIndex}">`,
      ...columns.map((column, columnIndex) => [
        `<div class="wpsc-site-header__column" data-header-column="${columnIndex}">`,
        ...(Array.isArray(column.children) ? column.children : []).map((child) => renderHeaderChild(child, context)),
        "</div>"
      ].join("")),
      "</div>"
    ].join("");
  }).join("");
}

function renderHeaderChild(child, context) {
  if (child?.blockName === "site/logo") {
    const text = child.props?.text || context.logoText;
    return text ? `<a class="wpsc-site-logo" href="${escapeAttribute(normalizeHref(child.props?.href ?? context.logoHref))}">${escapeHtml(text)}</a>` : "";
  }

  if (child?.blockName === "site/nav") {
    const items = Array.isArray(child.props?.items) ? child.props.items : context.navItems;
    return items.length > 0
      ? [
        '<nav class="wpsc-site-nav" aria-label="Primary">',
        ...items.map((item) => `<a href="${escapeAttribute(normalizeHref(item.href))}">${escapeHtml(item.label)}</a>`),
        "</nav>"
      ].join("")
      : "";
  }

  if (child?.blockName === "site/dark-mode-toggle") {
    return context.showDarkMode ? renderDarkModeToggleHtml(child.props?.label ?? "Đổi giao diện sáng tối") : "";
  }

  return "";
}

function normalizeHref(value) {
  const href = String(value ?? "").trim();

  if (!href) {
    return "#";
  }

  if (href.startsWith("#") || href.startsWith("/") || href.startsWith("http://") || href.startsWith("https://")) {
    return href;
  }

  return `/${href.replace(/^\/+/, "")}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
