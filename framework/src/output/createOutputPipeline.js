import { copyFile, cp, mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { SITE_RUNTIME_INDEX_PHP } from "../runtime/bootstrap/createSiteRuntime.js";

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
      const publicRoot = path.dirname(publicDir);
      const buildId = String(input.buildId || Date.now()).replace(/[^a-zA-Z0-9_-]/g, "_");
      const stagingDir = path.join(publicRoot, `.dist-staging-${buildId}`);
      const backupDir = path.join(publicRoot, `.dist-previous-${buildId}`);
      await recover(publicDir, backupDir);
      await rm(stagingDir, { force: true, recursive: true });
      // Incremental output overlays the last verified snapshot; full output starts clean.
      if (input.replace !== true && await exists(publicDir)) await cp(publicDir, stagingDir, { recursive: true });
      else await mkdir(stagingDir, { recursive: true });
      // Keep the Site entrypoint in sync so a completed build takes over from Setup.
      await writeFile(path.join(publicRoot, "index.php"), SITE_RUNTIME_INDEX_PHP, "utf8");
      const generatedFiles = [];
      for (const page of pages) {
        const target = resolveInside(stagingDir, pageFilePath(page.path));
        await mkdir(path.dirname(target), { recursive: true });
        await writeFile(target, String(page.html || ""), "utf8");
        generatedFiles.push(target);
      }
      for (const asset of assets) {
        const target = resolveInside(stagingDir, asset.targetPath);
        await mkdir(path.dirname(target), { recursive: true });
        await copyFile(asset.sourcePath, target);
        generatedFiles.push(target);
      }
      if (input.verify === true) await verifySnapshot(stagingDir);
      await publishSnapshot({ backupDir, publicDir, stagingDir });
      return { diagnostics: { errors: [], warnings: [] }, generatedFiles: generatedFiles.map((file) => path.join(publicDir, path.relative(stagingDir, file))), ok: true, publicDir };
    } catch (error) {
      return { diagnostics: { errors: [diagnostic("output.pipeline.write.failed", error.message)], warnings: [] }, ok: false };
    }
  }
  return Object.freeze({ version: OUTPUT_PIPELINE_VERSION, write });
}

async function verifySnapshot(root) {
  const readJson = async (relative) => JSON.parse(await readFile(path.join(root, relative), "utf8"));
  const manifest = await readJson(".wpsc/manifest.json");
  const routeData = await readJson("data/manifest.json");
  if (!Array.isArray(manifest.routes) || !Array.isArray(routeData.routes)) throw new Error("Output integrity manifest is invalid.");
  for (const route of manifest.routes) {
    await stat(path.join(root, route.outputPath));
  }
  for (const route of routeData.routes) await stat(path.join(root, route.outputPath));
  await readJson(".wpsc/routes.json");
  await readJson(".wpsc/media.json");
}

async function exists(target) { try { await stat(target); return true; } catch { return false; } }
async function recover(publicDir, backupDir) { if (!await exists(publicDir) && await exists(backupDir)) await rename(backupDir, publicDir); }
async function publishSnapshot({ backupDir, publicDir, stagingDir }) {
  if (await exists(publicDir)) await rename(publicDir, backupDir);
  try { await rename(stagingDir, publicDir); } catch (error) { if (!await exists(publicDir) && await exists(backupDir)) await rename(backupDir, publicDir); throw error; }
  await rm(backupDir, { force: true, recursive: true });
}
