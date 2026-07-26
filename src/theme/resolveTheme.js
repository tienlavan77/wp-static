import path from "node:path";
import { stat } from "node:fs/promises";
import importProjectModule from "../shared/importProjectModule.js";

export default async function resolveTheme(config, projectDir, options = {}) {
  const themeConfig = config.theme ?? {};
  const fallbackLayoutPath = resolvePath(
    config._paths?.themeLayout,
    projectDir,
    themeConfig.layout
  );
  const layoutPaths = resolveLayoutPaths(themeConfig, config._paths?.themeLayouts, projectDir);
  const componentsPath = config._paths?.themeComponents ?? resolveOptionalPath(projectDir, themeConfig.components);
  const themeBlocksPath = config._paths?.themeBlocks ?? resolveOptionalPath(projectDir, themeConfig.blocks);
  const projectBlocksPath = config._paths?.projectBlocks ?? resolveOptionalPath(projectDir, config.project?.blocks);
  const assetsDir = config._paths?.themeAssets ?? resolveOptionalPath(projectDir, themeConfig.assets);
  const metadata = {
    name: themeConfig.meta?.name ?? themeConfig.name ?? config.name,
    version: themeConfig.meta?.version ?? null,
    description: themeConfig.meta?.description ?? null,
    fingerprint: await createThemeFingerprint([
      fallbackLayoutPath,
      ...Object.values(layoutPaths),
      componentsPath,
      themeBlocksPath,
      projectBlocksPath,
      assetsDir
    ])
  };
  const fallbackLayout = await importDefaultModule(fallbackLayoutPath, options);
  const layouts = await loadLayouts(layoutPaths, options);
  const components = await loadComponents(componentsPath, options);
  const themeBlocks = await loadBlockLibrary(themeBlocksPath, options);
  const projectBlocks = await loadBlockLibrary(projectBlocksPath, options);

  return {
    metadata,
    blocks: mergeBlockLibraries(themeBlocks, projectBlocks),
    components,
    assetsDir,
    resolveLayout(content) {
      return layouts.get(content.type) ?? fallbackLayout;
    }
  };
}

function resolveLayoutPaths(themeConfig, normalizedLayouts, projectDir) {
  const entries = Object.entries(normalizedLayouts ?? themeConfig.layouts ?? {});
  return Object.fromEntries(entries.map(([contentType, layoutPath]) => [
    contentType,
    resolvePath(layoutPath, projectDir, layoutPath)
  ]));
}

async function loadLayouts(layoutPaths, options) {
  const entries = Object.entries(layoutPaths);
  const layouts = new Map();

  for (const [contentType, layoutPath] of entries) {
    layouts.set(contentType, await importDefaultModule(layoutPath, options));
  }

  return layouts;
}

async function loadComponents(componentsPath, options) {
  if (!componentsPath) {
    return {};
  }

  return importDefaultModule(componentsPath, options);
}

async function loadBlockLibrary(blocksPath, options) {
  if (!blocksPath) {
    return [];
  }

  const blocks = await importDefaultExport(blocksPath, options);

  if (!Array.isArray(blocks)) {
    throw new Error(`Theme block library must export an array: ${blocksPath}`);
  }

  return blocks;
}

function mergeBlockLibraries(...libraries) {
  const blocks = new Map();

  for (const library of libraries) {
    for (const block of library) {
      if (block?.name) {
        blocks.set(block.name, block);
      }
    }
  }

  return [...blocks.values()];
}

async function importDefaultModule(absolutePath, options = {}) {
  const value = await importDefaultExport(absolutePath, options);

  if (typeof value !== "function" && !isPlainObject(value)) {
    throw new Error(`Theme module must export a function or plain object: ${absolutePath}`);
  }

  return value;
}

async function importDefaultExport(absolutePath, options = {}) {
  const module = await importProjectModule(absolutePath, options);
  return module.default ?? module;
}

function resolvePath(normalizedPath, projectDir, inputPath) {
  if (normalizedPath) {
    return normalizedPath;
  }

  return path.resolve(projectDir, inputPath);
}

async function createThemeFingerprint(paths) {
  const entries = [];

  for (const filePath of paths.filter(Boolean)) {
    try {
      const info = await stat(filePath);
      entries.push({
        mtimeMs: Math.trunc(info.mtimeMs),
        path: filePath,
        size: info.size
      });
    } catch {
      entries.push({
        missing: true,
        path: filePath
      });
    }
  }

  return entries;
}

function resolveOptionalPath(projectDir, inputPath) {
  if (typeof inputPath !== "string" || inputPath.trim() === "") {
    return null;
  }

  return path.resolve(projectDir, inputPath);
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
