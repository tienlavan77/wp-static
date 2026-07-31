import { decodeHtmlEntities, stripHtml } from "../shared/text.js";

export function getSearchQuery() {
  return String(new URLSearchParams(window.location.search).get("s") || "").trim();
}

export function getSearchType(content) {
  if (content && content.type === "product") return "product";
  if (content && String(content.type || "").startsWith("archive:")) return "archive";
  return "page";
}

export function getSearchTypeLabel(type) {
  if (type === "product") return "Sản phẩm";
  if (type === "archive") return "Danh mục";
  return "Trang";
}

export function getSearchImage(content) {
  var data = content && content.data || {};
  var image = data.featuredImage || data.image || data.images && data.images[0] || null;

  if (typeof image === "string") return image;
  if (image && typeof image === "object") return image.url || image.src || image.sourceUrl || "";
  return "";
}

export function getSearchExcerpt(content) {
  return stripHtml(decodeHtmlEntities(content?.excerpt || content?.content || "")).slice(0, 150);
}
