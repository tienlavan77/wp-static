import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export default async function writeSearchIndex(sitePlan, options = {}) {
  const outputDir = options.outputDir;
  const dataDir = path.join(outputDir, "data");
  const items = (sitePlan.routes ?? [])
    .filter((route) => shouldIndexRoute(route))
    .map((route) => createSearchIndexItem(route))
    .filter(Boolean);
  const payload = {
    schemaVersion: 1,
    kind: "searchIndex",
    generatedAt: new Date().toISOString(),
    itemCount: items.length,
    items
  };
  const indexPath = path.join(dataDir, "search-index.json");

  await mkdir(dataDir, { recursive: true });
  await writeFile(indexPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  return {
    indexPath,
    itemCount: items.length
  };
}

function shouldIndexRoute(route) {
  const content = route.content;

  if (!content || route.path === "/search") {
    return false;
  }

  return ["product", "page", "post"].includes(content.type) || String(content.type ?? "").startsWith("archive:");
}

function createSearchIndexItem(route) {
  const content = route.content;
  const data = content.data ?? {};
  const type = getSearchType(content);
  const categories = getCategories(data);
  const title = content.title ?? data.title ?? content.slug ?? route.path;
  const excerpt = stripHtml(data.excerpt ?? data.shortDescription ?? data.description ?? data.content ?? "");

  return {
    id: content.id ?? route.path,
    type,
    path: route.path,
    title,
    slug: content.slug ?? route.path.replace(/^\/+/, ""),
    image: normalizeImageUrl(data.featuredImage ?? data.image ?? data.images?.[0]),
    category: categories[0] ?? "",
    categories,
    price: getPrice(content),
    priceLabel: getPriceLabel(content),
    currency: data.currency ?? "VND",
    keywords: normalizeText([
      title,
      content.slug,
      excerpt,
      categories.join(" ")
    ].join(" "))
  };
}

function getSearchType(content) {
  if (content.type === "product") {
    return "product";
  }

  if (String(content.type ?? "").startsWith("archive:")) {
    return "archive";
  }

  return "page";
}

function getCategories(data) {
  return [
    ...(data.categories ?? []),
    ...(data.terms ?? [])
  ]
    .map((term) => term.name ?? term.label ?? term.slug ?? "")
    .filter(Boolean);
}

function getPrice(content) {
  if (content.type !== "product") {
    return null;
  }

  const data = content.data ?? {};
  const variantPrices = (data.variants ?? [])
    .map((variant) => Number(variant.price ?? variant.salePrice ?? variant.regularPrice))
    .filter(Number.isFinite);

  if (variantPrices.length > 0) {
    return {
      max: Math.max(...variantPrices),
      min: Math.min(...variantPrices)
    };
  }

  const price = Number(data.price ?? data.salePrice ?? data.regularPrice);

  return Number.isFinite(price) ? { max: price, min: price } : null;
}

function getPriceLabel(content) {
  const price = getPrice(content);
  const currency = content.data?.currency ?? "VND";

  if (!price) {
    return "";
  }

  if (price.min === price.max) {
    return formatCurrency(price.min, currency);
  }

  return `${formatCurrency(price.min, currency)} - ${formatCurrency(price.max, currency)}`;
}

function formatCurrency(value, currency) {
  return new Intl.NumberFormat("vi-VN", {
    currency,
    style: "currency"
  }).format(value);
}

function normalizeImageUrl(image) {
  if (!image) {
    return "";
  }

  if (typeof image === "string") {
    return image;
  }

  return image.url ?? image.src ?? image.sourceUrl ?? "";
}

function stripHtml(value) {
  return String(value ?? "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function normalizeText(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
}
