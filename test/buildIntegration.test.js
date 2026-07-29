import assert from "node:assert/strict";
import test from "node:test";
import createBuildEngine, { BuildClient, BuildState } from "../src/build/createBuildEngine.js";
import createBuildIntegration from "../src/build/createBuildIntegration.js";

test("Build Integration composes Runtime Reader, Builder V1, and Output through Build Engine", async () => {
  const calls = [];
  const integration = createBuildIntegration({
    buildEngine: createBuildEngine({ createBuildId: () => "build-1", now: () => "2026-07-30T00:00:00.000Z" }),
    contentReader: { read: async ({ siteId }) => { calls.push(`read:${siteId}`); return { assets: [], items: [{ id: 1, slug: "welcome", title: "Welcome", type: "page" }] }; } },
    outputPipeline: { write: async ({ pages, siteId }) => { calls.push(`write:${siteId}:${pages.length}`); return { diagnostics: { errors: [], warnings: [] }, generatedFiles: ["/sites/company-a/public/welcome/index.html"], ok: true }; } },
    runtimeV1Builder: { build: async () => ({ assets: [] }) }
  });
  const result = await integration.build({ client: BuildClient.CLI, siteId: "company-a" });
  assert.equal(result.status, BuildState.SUCCESS);
  assert.deepEqual(result.generatedFiles, ["/sites/company-a/public/welcome/index.html"]);
  assert.deepEqual(calls, ["read:company-a", "write:company-a:0"]);
});

test("Build Integration fails through Build Engine when a pipeline component rejects", async () => {
  const integration = createBuildIntegration({
    buildEngine: createBuildEngine({ createBuildId: () => "build-failure", now: () => "2026-07-30T00:00:00.000Z" }),
    contentReader: { read: async () => ({ invalid: true }) },
    outputPipeline: { write: async () => { throw new Error("must not write"); } },
    runtimeV1Builder: { build: async () => ({ assets: [] }) }
  });
  const result = await integration.build({ client: BuildClient.CLI, siteId: "company-a" });
  assert.equal(result.status, BuildState.FAILED);
  assert.equal(result.diagnostics.errors[0].code, "build.source.content.invalid");
});

test("Build Integration delegates prepared content to the Runtime Builder V1 before the Output Pipeline", async () => {
  const calls = [];
  const integration = createBuildIntegration({
    buildEngine: createBuildEngine({ createBuildId: () => "build-v1", now: () => "2026-07-30T00:00:00.000Z" }),
    contentReader: {
      read: async () => ({
        collections: { terms: [{ id: 1, slug: "cards", taxonomy: "product_cat" }] },
        items: [{ id: "product-1", slug: "card", type: "product" }]
      })
    },
    outputPipeline: {
      write: async (input) => {
        calls.push(input);
        return { diagnostics: { errors: [], warnings: [] }, generatedFiles: ["/sites/company-a/public/dist/index.html"], ok: true };
      }
    },
    runtimeV1Builder: {
      build: async (input) => {
        assert.equal(input.buildId, "build-v1");
        assert.deepEqual(input.changed, ["product:card"]);
        assert.equal(input.collections.terms[0].slug, "cards");
        return { assets: [{ sourcePath: "/staging/index.html", targetPath: "index.html" }] };
      }
    }
  });

  const result = await integration.build({ changed: ["product:card"], siteId: "company-a" });
  assert.equal(result.status, BuildState.SUCCESS);
  assert.equal(calls[0].assets[0].targetPath, "index.html");
  assert.deepEqual(calls[0].pages, []);
});
