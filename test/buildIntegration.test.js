import assert from "node:assert/strict";
import test from "node:test";
import createBuildEngine, { BuildClient, BuildState } from "../framework/src/build/createBuildEngine.js";
import createBuildIntegration from "../framework/src/build/createBuildIntegration.js";

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
    site: { url: "https://company-a.example.test" },
    runtimeV1Builder: {
      build: async (input) => {
        assert.equal(input.buildId, "build-v1");
        assert.deepEqual(input.changed, ["product:card"]);
        assert.equal(input.collections.terms[0].slug, "cards");
        assert.deepEqual(input.site, { siteId: "company-a", url: "https://company-a.example.test" });
        return { assets: [{ sourcePath: "/staging/index.html", targetPath: "index.html" }], incremental: { fullBuild: false } };
      }
    }
  });

  const result = await integration.build({ changed: ["product:card"], siteId: "company-a" });
  assert.equal(result.status, BuildState.SUCCESS);
  assert.equal(calls[0].assets[0].targetPath, "index.html");
  assert.deepEqual(calls[0].pages, []);
  assert.equal(calls[0].replace, false);
});

test("Build Integration persists a dependency snapshot only after output succeeds", async () => {
  const calls = [];
  const integration = createBuildIntegration({
    buildEngine: createBuildEngine({ createBuildId: () => "build-manifest", now: () => "2026-07-30T00:00:00.000Z" }),
    contentReader: { read: async () => ({ items: [] }) },
    dependencyManifestStore: {
      load: async (siteId) => { calls.push(`load:${siteId}`); return null; },
      save: async (input) => { calls.push(`save:${input.buildId}:${input.siteId}`); }
    },
    outputPipeline: { write: async () => { calls.push("write"); return { diagnostics: { errors: [], warnings: [] }, generatedFiles: [], ok: true }; } },
    runtimeV1Builder: { build: async (input) => ({ assets: [], incremental: { dependencyGraph: { "/": {} }, fullBuild: true }, input }) }
  });

  const result = await integration.build({ siteId: "company-a" });
  assert.equal(result.status, BuildState.SUCCESS);
  assert.deepEqual(calls, ["load:company-a", "write", "save:build-manifest:company-a"]);
});

test("Build Integration does not persist a dependency snapshot when output fails", async () => {
  let saved = false;
  const integration = createBuildIntegration({
    buildEngine: createBuildEngine({ createBuildId: () => "build-fail", now: () => "2026-07-30T00:00:00.000Z" }),
    contentReader: { read: async () => ({ items: [] }) },
    dependencyManifestStore: { load: async () => null, save: async () => { saved = true; } },
    outputPipeline: { write: async () => ({ diagnostics: { errors: [{ code: "output.failed", message: "No publish", severity: "error" }], warnings: [] }, ok: false }) },
    runtimeV1Builder: { build: async () => ({ assets: [], incremental: { dependencyGraph: { "/": {} }, fullBuild: true } }) }
  });

  assert.equal((await integration.build({ siteId: "company-a" })).status, BuildState.FAILED);
  assert.equal(saved, false);
});

test("Build Integration saves a content snapshot after a successful publish", async () => {
  const saved = [];
  const integration = createBuildIntegration({
    buildEngine: createBuildEngine({ createBuildId: () => "build-content", now: () => "2026-07-30T00:00:00.000Z" }),
    contentReader: { read: async (input) => ({ collections: { terms: [] }, items: [{ id: "product-1", slug: "product", type: "product" }], input }) },
    contentSnapshotStore: { load: async () => null, save: async (input) => saved.push(input) },
    outputPipeline: { write: async () => ({ diagnostics: { errors: [], warnings: [] }, generatedFiles: [], ok: true }) },
    runtimeV1Builder: { build: async () => ({ assets: [], incremental: { fullBuild: true } }) }
  });

  assert.equal((await integration.build({ changed: ["product:product"], siteId: "company-a" })).status, BuildState.SUCCESS);
  assert.deepEqual(saved, [{ buildId: "build-content", collections: { terms: [] }, items: [{ id: "product-1", slug: "product", type: "product" }], siteId: "company-a" }]);
});
