export default function createPluginContext(config, options = {}) {
  return {
    config,
    projectDir: config._paths?.projectDir ?? options.projectDir ?? process.cwd()
  };
}
