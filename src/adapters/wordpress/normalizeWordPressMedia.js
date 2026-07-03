export default function normalizeWordPressMedia(rawMedia = {}) {
  return {
    id: rawMedia.id,
    alt: rawMedia.alt_text ?? "",
    caption: stripTags(rawMedia.caption?.rendered ?? ""),
    mimeType: rawMedia.mime_type ?? null,
    sourceUrl: rawMedia.source_url ?? null,
    title: stripTags(rawMedia.title?.rendered ?? rawMedia.title ?? "")
  };
}

function stripTags(value) {
  return String(value).replace(/<[^>]*>/g, "").trim();
}
