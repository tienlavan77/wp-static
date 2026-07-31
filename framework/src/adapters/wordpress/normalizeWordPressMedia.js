export default function normalizeWordPressMedia(rawMedia = {}) {
  const details = rawMedia.media_details ?? {};

  return {
    id: rawMedia.id === undefined || rawMedia.id === null ? null : String(rawMedia.id),
    alt: rawMedia.alt_text ?? "",
    caption: stripTags(rawMedia.caption?.rendered ?? ""),
    height: numberOrNull(details.height ?? rawMedia.height),
    metadata: {
      date: rawMedia.date ?? null,
      file: details.file ?? null,
      modified: rawMedia.modified ?? null,
      sourceId: rawMedia.id ?? null
    },
    mimeType: rawMedia.mime_type ?? details.mime_type ?? null,
    provider: "wordpress",
    responsive: normalizeResponsiveSources(details.sizes),
    sourceUrl: rawMedia.source_url ?? null,
    title: stripTags(rawMedia.title?.rendered ?? rawMedia.title ?? ""),
    width: numberOrNull(details.width ?? rawMedia.width)
  };
}

function normalizeResponsiveSources(sizes) {
  if (!sizes || typeof sizes !== "object") return [];

  return Object.entries(sizes)
    .map(([name, source]) => ({
      height: numberOrNull(source?.height),
      mimeType: source?.mime_type ?? null,
      name,
      sourceUrl: source?.source_url ?? null,
      width: numberOrNull(source?.width)
    }))
    .filter((source) => source.sourceUrl)
    .sort((first, second) => first.width - second.width || first.name.localeCompare(second.name));
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function stripTags(value) {
  return String(value).replace(/<[^>]*>/g, "").trim();
}
