import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import createSafeDataFilename from "../data/createSafeDataFilename.js";
import extractMainFragment from "./extractMainFragment.js";

export default async function writeFragmentOutputs(pages, options = {}) {
  const outputDir = options.outputDir;
  const fragmentsDir = path.join(outputDir, "fragments");
  const files = [];

  await mkdir(fragmentsDir, { recursive: true });

  for (const page of pages) {
    const slug = createFragmentSlug(page.route);
    const fragment = extractMainFragment(page.html);
    const relativePath = `fragments/${slug}/main.html`;
    const outputPath = path.join(outputDir, relativePath);

    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, fragment, "utf8");
    files.push({
      contentId: page.route.content.id,
      contentType: page.route.content.type,
      path: page.route.path,
      fragmentPath: `/${relativePath}`,
      outputPath: relativePath
    });
  }

  const manifest = {
    schemaVersion: 1,
    kind: "fragmentManifest",
    generatedAt: new Date().toISOString(),
    fragments: files
  };
  const manifestPath = path.join(fragmentsDir, "manifest.json");
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  return {
    files,
    fragmentsWritten: files.length,
    manifestPath
  };
}

export function createFragmentPublicPath(route) {
  return `/fragments/${createFragmentSlug(route)}/main.html`;
}

function createFragmentSlug(route) {
  if (route.path === "/") {
    return "index";
  }

  return createSafeDataFilename(route.path);
}
