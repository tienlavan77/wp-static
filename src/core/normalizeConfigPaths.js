import path from "node:path";

export default function normalizeConfigPaths(config, projectDir) {
  const themeLayouts = Object.fromEntries(
    Object.entries(config.theme?.layouts ?? {}).map(([contentType, layoutPath]) => [
      contentType,
      path.resolve(projectDir, layoutPath)
    ])
  );
  const plugins = (config.plugins ?? []).map((pluginConfig) => {
    if (typeof pluginConfig === "string") {
      return path.resolve(projectDir, pluginConfig);
    }

    return {
      ...pluginConfig,
      path: pluginConfig?.path ? path.resolve(projectDir, pluginConfig.path) : pluginConfig?.path
    };
  });

  return {
    ...config,
    _paths: {
      projectDir,
      outputDir: path.resolve(projectDir, config.outputDir),
      publicDir: config.publicDir ? path.resolve(projectDir, config.publicDir) : null,
      adapterSource: config.adapter?.source ? path.resolve(projectDir, config.adapter.source) : null,
      themeAssets: config.theme?.assets ? path.resolve(projectDir, config.theme.assets) : null,
      themeComponents: config.theme?.components ? path.resolve(projectDir, config.theme.components) : null,
      themeLayout: config.theme?.layout ? path.resolve(projectDir, config.theme.layout) : null,
      themeLayouts,
      plugins
    }
  };
}
