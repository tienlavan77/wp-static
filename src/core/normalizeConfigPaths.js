import path from "node:path";

export default function normalizeConfigPaths(config, projectDir) {
  return {
    ...config,
    _paths: {
      projectDir,
      outputDir: path.resolve(projectDir, config.outputDir),
      publicDir: config.publicDir ? path.resolve(projectDir, config.publicDir) : null,
      adapterSource: config.adapter?.source ? path.resolve(projectDir, config.adapter.source) : null,
      themeLayout: config.theme?.layout ? path.resolve(projectDir, config.theme.layout) : null
    }
  };
}
