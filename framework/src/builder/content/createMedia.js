import deepFreeze from "../../shared/deepFreeze.js";

export default function createMedia(rawMedia = {}) {
  return deepFreeze({
    id: rawMedia.id,
    alt: rawMedia.alt ?? rawMedia.alt_text ?? "",
    caption: rawMedia.caption ?? "",
    height: rawMedia.height ?? null,
    metadata: structuredClone(rawMedia.metadata ?? {}),
    mimeType: rawMedia.mimeType ?? rawMedia.mime_type ?? null,
    provider: rawMedia.provider ?? null,
    responsive: structuredClone(rawMedia.responsive ?? []),
    sourceUrl: rawMedia.sourceUrl ?? rawMedia.source_url ?? rawMedia.src ?? null,
    title: rawMedia.title ?? rawMedia.name ?? "",
    width: rawMedia.width ?? null
  });
}
