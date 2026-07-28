import assert from "node:assert/strict";
import test from "node:test";
import createBuildEngine, { BuildClient, BuildState } from "../src/build/createBuildEngine.js";
import createBuildIntegration from "../src/build/createBuildIntegration.js";
import createContentPipeline from "../src/content/createContentPipeline.js";
import createThemeRenderer from "../src/renderer/createThemeRenderer.js";

test("Build Integration composes reader, content, theme, and output through Build Engine", async () => {
  const calls = [];
  const integration = createBuildIntegration({
    buildEngine: createBuildEngine({ createBuildId: () => "build-1", now: () => "2026-07-30T00:00:00.000Z" }),
    contentPipeline: createContentPipeline(),
    contentReader: { read: async ({ siteId }) => { calls.push(`read:${siteId}`); return { assets: [], items: [{ id: 1, slug: "welcome", title: "Welcome", type: "page" }] }; } },
    outputPipeline: { write: async ({ pages, siteId }) => { calls.push(`write:${siteId}:${pages.length}`); return { diagnostics: { errors: [], warnings: [] }, generatedFiles: ["/sites/company-a/public/welcome/index.html"], ok: true }; } },
    themeRenderer: createThemeRenderer({ defaultLayout: ({ content, html }) => html`<main>${content.title}</main>` })
  });
  const result = await integration.build({ client: BuildClient.CLI, siteId: "company-a" });
  assert.equal(result.status, BuildState.SUCCESS);
  assert.deepEqual(result.generatedFiles, ["/sites/company-a/public/welcome/index.html"]);
  assert.deepEqual(calls, ["read:company-a", "write:company-a:1"]);
});

test("Build Integration fails through Build Engine when a pipeline component rejects", async () => {
  const integration = createBuildIntegration({
    buildEngine: createBuildEngine({ createBuildId: () => "build-failure", now: () => "2026-07-30T00:00:00.000Z" }),
    contentPipeline: createContentPipeline(),
    contentReader: { read: async () => ({ items: [{ id: 1, type: "page" }] }) },
    outputPipeline: { write: async () => { throw new Error("must not write"); } },
    themeRenderer: createThemeRenderer({ defaultLayout: () => "" })
  });
  const result = await integration.build({ client: BuildClient.CLI, siteId: "company-a" });
  assert.equal(result.status, BuildState.FAILED);
  assert.equal(result.diagnostics.errors[0].code, "content.pipeline.content.invalid");
});
