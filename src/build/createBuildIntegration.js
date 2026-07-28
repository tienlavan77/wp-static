import { BuildClient } from "./createBuildEngine.js";

export const BUILD_INTEGRATION_VERSION = "1.0";

function diagnostic(code, message) {
  return { code, message, severity: "error" };
}

export default function createBuildIntegration(options = {}) {
  const buildEngine = options.buildEngine;
  const contentPipeline = options.contentPipeline;
  const contentReader = options.contentReader;
  const outputPipeline = options.outputPipeline;
  const themeRenderer = options.themeRenderer;
  if (!buildEngine || !contentPipeline || !contentReader || !outputPipeline || !themeRenderer) {
    throw new TypeError("Build Integration requires engine, reader, content, theme, and output components.");
  }

  async function build(input = {}) {
    const client = input.client || (input.triggerType === "browser" ? BuildClient.BROWSER : input.triggerType === "cli" ? BuildClient.CLI : BuildClient.DASHBOARD);
    const started = buildEngine.start({ client, siteId: input.siteId });
    if (!started.ok) return started;
    try {
      const source = await contentReader.read({ siteId: started.context.siteId });
      if (!source || !Array.isArray(source.items)) {
        return buildEngine.fail(started.buildId, { diagnostics: { errors: [diagnostic("build.source.content.invalid", "Content Reader must return an items array.")], warnings: [] } });
      }
      const content = contentPipeline.run(source.items);
      if (!content.ok) return buildEngine.fail(started.buildId, { diagnostics: content.diagnostics });
      const rendered = themeRenderer.render(content.model);
      if (!rendered.ok) return buildEngine.fail(started.buildId, { diagnostics: rendered.diagnostics });
      const output = await outputPipeline.write({ assets: source.assets || [], pages: rendered.pages, siteId: started.context.siteId });
      if (!output.ok) return buildEngine.fail(started.buildId, { diagnostics: output.diagnostics });
      return buildEngine.finish(started.buildId, { generatedFiles: output.generatedFiles });
    } catch (error) {
      return buildEngine.fail(started.buildId, { diagnostics: { errors: [diagnostic("build.integration.failed", error.message)], warnings: [] } });
    }
  }

  return Object.freeze({ build, version: BUILD_INTEGRATION_VERSION });
}
