export default function createSafeDataFilename(value, fallback = "item") {
  const filename = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/^\/+|\/+$/g, "")
    .replaceAll("/", "__")
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 96);

  return filename || fallback;
}
