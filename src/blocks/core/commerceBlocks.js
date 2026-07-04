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

const coreCommerceBlocks = [
  headingBlock,
  contentTextBlock,
  productPriceBlock,
  archiveLinksBlock
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

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
