import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import createSafeDataFilename from "./createSafeDataFilename.js";

const CONTENT_GROUPS = {
  page: "pages",
  post: "posts",
  product: "products"
};

export default async function writeNormalizedContentStore(sitePlan, options = {}) {
  const outputDir = options.outputDir;
  const baseDir = path.join(outputDir, "data", "content");
  const manifest = {
    schemaVersion: 1,
    kind: "normalizedContentStore",
    generatedAt: new Date().toISOString(),
    groups: {},
    files: []
  };

  await mkdir(baseDir, { recursive: true });

  await writeItems({
    baseDir,
    group: "menus",
    items: sitePlan.graph?.menus?.items ?? [],
    manifest,
    payloadFor: (item) => ({ kind: "menu", menu: item })
  });
  await writeItems({
    baseDir,
    group: "media",
    items: sitePlan.graph?.media?.items ?? [],
    manifest,
    payloadFor: (item) => ({ kind: "media", media: item })
  });
  await writeItems({
    baseDir,
    group: "taxonomies",
    items: sitePlan.graph?.terms?.items ?? [],
    manifest,
    payloadFor: (item) => ({ kind: "taxonomyTerm", term: item })
  });

  for (const content of sitePlan.graph?.contents?.items ?? []) {
    const group = getContentGroup(content);
    await writeItem({
      baseDir,
      group,
      item: content,
      manifest,
      payload: {
        kind: "content",
        content
      }
    });
  }

  const manifestPath = path.join(baseDir, "manifest.json");
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  return {
    filesWritten: manifest.files.length,
    manifestPath,
    groups: manifest.groups
  };
}

async function writeItems(options) {
  for (const item of options.items) {
    await writeItem({
      baseDir: options.baseDir,
      group: options.group,
      item,
      manifest: options.manifest,
      payload: options.payloadFor(item)
    });
  }
}

async function writeItem({ baseDir, group, item, manifest, payload }) {
  const id = item.id ?? item.slug ?? item.path ?? item.title;
  const filename = `${createSafeDataFilename(item.slug ?? id)}.json`;
  const relativePath = path.join("data", "content", group, filename);
  const outputPath = path.join(baseDir, group, filename);

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");

  manifest.groups[group] = (manifest.groups[group] ?? 0) + 1;
  manifest.files.push({
    group,
    id: id ?? null,
    path: relativePath.replaceAll(path.sep, "/")
  });
}

function getContentGroup(content) {
  if (CONTENT_GROUPS[content.type]) {
    return CONTENT_GROUPS[content.type];
  }

  if (String(content.type ?? "").startsWith("archive:")) {
    return "archives";
  }

  return "custom";
}
