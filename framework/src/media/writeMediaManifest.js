import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export const MEDIA_MANIFEST_SCHEMA = "wpsc.media-manifest";
export const MEDIA_MANIFEST_VERSION = 1;

export default async function writeMediaManifest(sitePlan, options = {}) {
  const outputDir = options.outputDir;
  const assetMap = options.assetMap ?? {};
  const media = deduplicateMedia(sitePlan.graph?.media?.items ?? [])
    .map((item) => normalizeManifestMedia(item, assetMap));
  const manifest = {
    media,
    schema: MEDIA_MANIFEST_SCHEMA,
    schemaVersion: MEDIA_MANIFEST_VERSION,
    siteId: options.siteId ?? options.site?.siteId ?? options.site?.id ?? null
  };
  const manifestPath = path.join(outputDir, ".wpsc", "media.json");

  await mkdir(path.dirname(manifestPath), { recursive: true });
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  return { count: media.length, manifest, manifestPath };
}

function deduplicateMedia(items) {
  const byKey = new Map();
  for (const item of items) {
    const key = String(item.id ?? item.sourceUrl ?? "");
    if (key && !byKey.has(key)) byKey.set(key, item);
  }
  return [...byKey.values()].sort((first, second) => String(first.id ?? first.sourceUrl).localeCompare(String(second.id ?? second.sourceUrl)));
}

function normalizeManifestMedia(item, assetMap) {
  return {
    alt: item.alt ?? "",
    caption: item.caption ?? "",
    height: item.height ?? null,
    id: item.id === undefined || item.id === null ? null : String(item.id),
    metadata: item.metadata ?? {},
    mimeType: item.mimeType ?? null,
    provider: item.provider ?? null,
    publicUrl: item.sourceUrl ? assetMap[item.sourceUrl] ?? null : null,
    responsive: (item.responsive ?? []).map((source) => ({
      height: source.height ?? null,
      mimeType: source.mimeType ?? null,
      name: source.name ?? "",
      publicUrl: source.sourceUrl ? assetMap[source.sourceUrl] ?? null : null,
      sourceUrl: source.sourceUrl ?? null,
      width: source.width ?? null
    })),
    sourceUrl: item.sourceUrl ?? null,
    title: item.title ?? "",
    width: item.width ?? null
  };
}
