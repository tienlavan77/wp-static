import { BuildClient } from "./createBuildEngine.js";

export const BUILD_INTEGRATION_VERSION = "1.0";

function diagnostic(code, message) {
  return { code, message, severity: "error" };
}

export default function createBuildIntegration(options = {}) {
  const buildEngine = options.buildEngine;
  const contentReader = options.contentReader;
  const outputPipeline = options.outputPipeline;
  const runtimeV1Builder = options.runtimeV1Builder;
  if (!buildEngine || !contentReader || !outputPipeline || !runtimeV1Builder) {
    throw new TypeError("Build Integration requires engine, Runtime Content Reader, Runtime V1 Builder, and Output Pipeline.");
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
      const built = await runtimeV1Builder.build({ buildId: started.buildId, changed: input.changed || [], collections: source.collections, contents: source.items, siteId: started.context.siteId });
      const output = await outputPipeline.write({ assets: built.assets, pages: [], siteId: started.context.siteId });
      if (!output.ok) return buildEngine.fail(started.buildId, { diagnostics: output.diagnostics });
      return buildEngine.finish(started.buildId, { generatedFiles: output.generatedFiles });
    } catch (error) {
      return buildEngine.fail(started.buildId, { diagnostics: { errors: [diagnostic("build.integration.failed", error.message)], warnings: [] } });
    }
  }

  return Object.freeze({ build, version: BUILD_INTEGRATION_VERSION });
}
