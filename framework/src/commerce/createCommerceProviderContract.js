import deepFreeze from "../shared/deepFreeze.js";

export const COMMERCE_PROVIDER_SCHEMA = "wpsc.commerce-provider";
export const COMMERCE_PROVIDER_VERSION = 1;

export default function createCommerceProviderContract(input = {}) {
  const siteId = String(input.siteId ?? "").trim();
  if (!siteId) throw new TypeError("Commerce Provider Contract requires a Site id.");

  return deepFreeze({
    attributes: (input.attributes ?? []).map(normalizeAttribute),
    categories: (input.categories ?? []).map((term) => normalizeTerm(term, "product_cat")),
    products: [...(input.products ?? [])],
    provider: "woocommerce",
    schema: COMMERCE_PROVIDER_SCHEMA,
    schemaVersion: COMMERCE_PROVIDER_VERSION,
    siteId,
    store: normalizeStoreConfiguration(input.store),
    tags: (input.tags ?? []).map((term) => normalizeTerm(term, "product_tag"))
  });
}

function normalizeAttribute(attribute = {}) {
  return {
    hasArchives: Boolean(attribute.has_archives ?? attribute.hasArchives),
    id: attribute.id === null || attribute.id === undefined ? null : String(attribute.id),
    name: String(attribute.name ?? ""),
    orderBy: String(attribute.order_by ?? attribute.orderBy ?? "menu_order"),
    slug: String(attribute.slug ?? ""),
    type: String(attribute.type ?? "select")
  };
}

function normalizeTerm(term = {}, taxonomy) {
  return {
    count: Number(term.count ?? 0),
    description: String(term.description ?? ""),
    id: term.id === null || term.id === undefined ? null : String(term.id),
    image: normalizeImage(term.image),
    name: String(term.name ?? ""),
    parentId: term.parent === null || term.parent === undefined ? null : String(term.parent),
    slug: String(term.slug ?? ""),
    taxonomy
  };
}

function normalizeImage(image) {
  if (!image) return null;
  return {
    alt: String(image.alt ?? ""),
    id: image.id === null || image.id === undefined ? null : String(image.id),
    sourceUrl: image.src ?? image.sourceUrl ?? image.url ?? null
  };
}

function normalizeStoreConfiguration(store = []) {
  const settings = Array.isArray(store)
    ? Object.fromEntries(store.map((setting) => [setting.id, setting.value]))
    : { ...(store ?? {}) };

  return {
    address: String(settings.woocommerce_store_address ?? settings.address ?? ""),
    address2: String(settings.woocommerce_store_address_2 ?? settings.address2 ?? ""),
    city: String(settings.woocommerce_store_city ?? settings.city ?? ""),
    country: String(settings.woocommerce_default_country ?? settings.country ?? ""),
    currency: String(settings.woocommerce_currency ?? settings.currency ?? ""),
    currencyPosition: String(settings.woocommerce_currency_pos ?? settings.currencyPosition ?? ""),
    decimalSeparator: String(settings.woocommerce_price_decimal_sep ?? settings.decimalSeparator ?? "."),
    decimals: Number(settings.woocommerce_price_num_decimals ?? settings.decimals ?? 2),
    postcode: String(settings.woocommerce_store_postcode ?? settings.postcode ?? ""),
    thousandSeparator: String(settings.woocommerce_price_thousand_sep ?? settings.thousandSeparator ?? ",")
  };
}
