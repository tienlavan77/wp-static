export function normalizeImageUrl(image) {
  if (!image) {
    return "";
  }

  if (typeof image === "string") {
    return image;
  }

  return image.sourceUrl ?? image.src ?? image.url ?? "";
}
