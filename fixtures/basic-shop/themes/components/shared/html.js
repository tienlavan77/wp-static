export function escapeText(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function escapeAttribute(value) {
  return escapeText(value).replaceAll('"', "&quot;");
}

export function stripHtml(value) {
  return String(value ?? "").replaceAll(/<[^>]*>/g, " ").replaceAll(/\s+/g, " ").trim();
}
