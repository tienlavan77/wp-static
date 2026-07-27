import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

function normalizeWorkspaceDir(workspaceDir) {
  return path.resolve(workspaceDir || process.cwd());
}

function assertSafeSiteId(siteId) {
  const value = String(siteId || "").trim();

  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(value)) {
    throw new Error(`Invalid site id: ${siteId}`);
  }

  return value;
}

function ensureInside(parent, child) {
  const relative = path.relative(parent, child);

  if (relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative))) {
    return child;
  }

  throw new Error(`Resolved path escapes workspace sites directory: ${child}`);
}

export default function createSiteRepository(options = {}) {
  const workspaceDir = normalizeWorkspaceDir(options.workspaceDir);
  const sitesDir = path.resolve(workspaceDir, options.sitesDir || "sites");

  function resolveSiteRoot(siteId) {
    const safeSiteId = assertSafeSiteId(siteId);
    return ensureInside(sitesDir, path.resolve(sitesDir, safeSiteId));
  }

  function resolveMetadataPath(siteId) {
    return path.join(resolveSiteRoot(siteId), "config", "site.json");
  }

  async function readMetadata(siteId) {
    const metadataPath = resolveMetadataPath(siteId);
    const raw = await readFile(metadataPath, "utf8");
    return JSON.parse(raw);
  }

  async function writeMetadata(siteId, metadata) {
    const metadataPath = resolveMetadataPath(siteId);
    await mkdir(path.dirname(metadataPath), {
      recursive: true
    });

    const tempPath = `${metadataPath}.tmp`;
    await writeFile(tempPath, `${JSON.stringify(metadata, null, 2)}\n`, "utf8");
    await rename(tempPath, metadataPath);

    return {
      metadata,
      path: metadataPath
    };
  }

  return {
    readMetadata,
    resolveMetadataPath,
    resolveSiteRoot,
    sitesDir,
    workspaceDir,
    writeMetadata
  };
}
