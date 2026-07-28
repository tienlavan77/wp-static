import { copyFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export const OUTPUT_PIPELINE_VERSION = "1.0";

function diagnostic(code, message) {
  return { code, message, severity: "error" };
}

function resolveInside(root, relativePath) {
  const target = path.resolve(root, relativePath);
  const relative = path.relative(root, target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) throw new Error("Output path escapes the public directory.");
  return target;
}

function pageFilePath(pagePath) {
  const normalized = String(pagePath || "").replace(/^\/+|\/+$/g, "");
  if (normalized.includes("..")) throw new Error("Page path is unsafe.");
  return path.join(normalized, "index.html");
}

export default function createOutputPipeline(options = {}) {
  const repository = options.repository;
  if (!repository || typeof repository.resolveSiteRoot !== "function") {
    throw new TypeError("Output Pipeline requires a Site Repository.");
  }

  async function write(input = {}) {
    const pages = input.pages || [];
    const assets = input.assets || [];
    if (!Array.isArray(pages) || !Array.isArray(assets)) {
      return { diagnostics: { errors: [diagnostic("output.pipeline.input.invalid", "Output pages and assets must be arrays.")], warnings: [] }, ok: false };
    }
    let publicDir;
    try {
      publicDir = path.join(repository.resolveSiteRoot(input.siteId), "public", "dist");
      await mkdir(publicDir, { recursive: true });
      const generatedFiles = [];
      for (const page of pages) {
        const target = resolveInside(publicDir, pageFilePath(page.path));
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, String(page.html || ""), "utf8");
        generatedFiles.push(target);
      }
      for (const asset of assets) {
        const target = resolveInside(publicDir, asset.targetPath);
        await mkdir(path.dirname(target), { recursive: true });
        await copyFile(asset.sourcePath, target);
        generatedFiles.push(target);
      }
      return { diagnostics: { errors: [], warnings: [] }, generatedFiles, ok: true, publicDir };
    } catch (error) {
      return { diagnostics: { errors: [diagnostic("output.pipeline.write.failed", error.message)], warnings: [] }, ok: false };
    }
  }
  return Object.freeze({ version: OUTPUT_PIPELINE_VERSION, write });
}
