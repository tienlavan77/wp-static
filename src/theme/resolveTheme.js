import path from "node:path";
import { pathToFileURL } from "node:url";

export default async function resolveTheme(config, projectDir) {
  const themeConfig = config.theme ?? {};
  const metadata = {
    name: themeConfig.meta?.name ?? themeConfig.name ?? config.name,
    version: themeConfig.meta?.version ?? null,
    description: themeConfig.meta?.description ?? null
  };
  const fallbackLayout = await importDefaultModule(resolvePath(
    config._paths?.themeLayout,
    projectDir,
    themeConfig.layout
  ));
  const layouts = await loadLayouts(themeConfig, config._paths?.themeLayouts, projectDir);
  const components = await loadComponents(themeConfig, config._paths?.themeComponents, projectDir);
  const assetsDir = config._paths?.themeAssets ?? resolveOptionalPath(projectDir, themeConfig.assets);

  return {
    metadata,
    components,
    assetsDir,
    resolveLayout(content) {
      return layouts.get(content.type) ?? fallbackLayout;
    }
  };
}

async function loadLayouts(themeConfig, normalizedLayouts, projectDir) {
  const entries = Object.entries(normalizedLayouts ?? themeConfig.layouts ?? {});
  const layouts = new Map();

  for (const [contentType, layoutPath] of entries) {
    layouts.set(contentType, await importDefaultModule(resolvePath(layoutPath, projectDir, layoutPath)));
  }

  return layouts;
}

async function loadComponents(themeConfig, normalizedPath, projectDir) {
  const componentsPath = normalizedPath ?? resolveOptionalPath(projectDir, themeConfig.components);

  if (!componentsPath) {
    return {};
  }

  return importDefaultModule(componentsPath);
}

async function importDefaultModule(absolutePath) {
  const module = await import(pathToFileURL(absolutePath).href);
  const value = module.default ?? module;

  if (typeof value !== "function" && !isPlainObject(value)) {
    throw new Error(`Theme module must export a function or plain object: ${absolutePath}`);
  }

  return value;
}

function resolvePath(normalizedPath, projectDir, inputPath) {
  if (normalizedPath) {
    return normalizedPath;
  }

  return path.resolve(projectDir, inputPath);
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
