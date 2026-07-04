import path from "node:path";
import { pathToFileURL } from "node:url";

export default async function loadPlugins(config, options = {}) {
  const projectDir = config._paths?.projectDir ?? options.projectDir ?? process.cwd();
  const pluginConfigs = config.plugins ?? [];

  if (!Array.isArray(pluginConfigs)) {
    throw new Error('Config field "plugins" must be an array when provided.');
  }

  const plugins = [];

  for (const pluginConfig of pluginConfigs) {
    plugins.push(await loadPlugin(pluginConfig, projectDir, options));
  }

  return plugins;
}

async function loadPlugin(pluginConfig, projectDir, options) {
  const pluginPath = typeof pluginConfig === "string" ? pluginConfig : pluginConfig?.path;

  if (typeof pluginPath !== "string" || pluginPath.trim() === "") {
    throw new Error('Plugin config must be a path string or an object with "path".');
  }

  const absolutePath = path.resolve(projectDir, pluginPath);
  const cacheSuffix = options.cacheBust ? `?t=${options.cacheBust}` : "";
  const module = await import(`${pathToFileURL(absolutePath).href}${cacheSuffix}`);
  const factoryOrPlugin = module.default ?? module;
  const plugin = typeof factoryOrPlugin === "function"
    ? await factoryOrPlugin(pluginConfig.options ?? {})
    : factoryOrPlugin;

  if (!plugin || typeof plugin !== "object" || Array.isArray(plugin)) {
    throw new Error(`Plugin must export a plain object or factory: ${absolutePath}`);
  }

  return {
    name: plugin.name ?? path.basename(pluginPath),
    ...plugin
  };
}
