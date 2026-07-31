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

  function resolveSourceMetadataPath(siteId) {
    return path.join(resolveSiteRoot(siteId), "config", "source.json");
  }

  function resolveSettingsPath(siteId) {
    return path.join(resolveSiteRoot(siteId), "config", "settings.json");
  }

  function resolveRegistryPath() {
    return path.join(sitesDir, "registry.json");
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

  async function readSourceMetadata(siteId) {
    const metadataPath = resolveSourceMetadataPath(siteId);
    const raw = await readFile(metadataPath, "utf8");
    return JSON.parse(raw);
  }

  async function writeSourceMetadata(siteId, metadata) {
    const metadataPath = resolveSourceMetadataPath(siteId);
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

  async function readSettings(siteId) {
    return JSON.parse(await readFile(resolveSettingsPath(siteId), "utf8"));
  }

  async function writeSettings(siteId, settings) {
    const settingsPath = resolveSettingsPath(siteId);
    await mkdir(path.dirname(settingsPath), { recursive: true });
    const tempPath = `${settingsPath}.tmp`;
    await writeFile(tempPath, `${JSON.stringify(settings, null, 2)}\n`, "utf8");
    await rename(tempPath, settingsPath);
    return { path: settingsPath, settings };
  }

  async function readRegistry() {
    return JSON.parse(await readFile(resolveRegistryPath(), "utf8"));
  }

  async function writeRegistry(registry) {
    const registryPath = resolveRegistryPath();
    await mkdir(path.dirname(registryPath), { recursive: true });
    const temporaryPath = `${registryPath}.tmp`;
    await writeFile(temporaryPath, `${JSON.stringify(registry, null, 2)}\n`, "utf8");
    await rename(temporaryPath, registryPath);
    return { path: registryPath, registry };
  }

  return {
    readMetadata,
    readRegistry,
    readSourceMetadata,
    readSettings,
    resolveMetadataPath,
    resolveRegistryPath,
    resolveSourceMetadataPath,
    resolveSettingsPath,
    resolveSiteRoot,
    sitesDir,
    workspaceDir,
    writeMetadata,
    writeRegistry,
    writeSettings,
    writeSourceMetadata
  };
}
