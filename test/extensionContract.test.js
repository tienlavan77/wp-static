import assert from "node:assert/strict";
import test from "node:test";
import createExtensionLoader from "../framework/src/runtime/extensions/createExtensionLoader.js";
import createHookSystem from "../framework/src/runtime/extensions/createHookSystem.js";
import createRuntimeContext from "../framework/src/runtime/bootstrap/createRuntimeContext.js";

test("Extension contract exposes capabilities, configuration and Site scope", async () => {
  const context = createRuntimeContext({ siteId: "site-a" });
  const loader = createExtensionLoader({ context, hooks: createHookSystem() });
  const extension = await loader.load({
    capabilities: ["seo", "theme"],
    configuration: { enabled: true },
    name: "site-theme",
    siteScope: "site",
    version: "2.0.0"
  });

  assert.equal(extension.contract, "wpsc.extension");
  assert.equal(extension.contractVersion, 1);
  assert.deepEqual(extension.capabilities, ["seo", "theme"]);
  assert.deepEqual(extension.configuration, { enabled: true });
  assert.equal(extension.siteId, "site-a");
  assert.equal(extension.siteScope, "site");
  assert.deepEqual(loader.describe("site-theme"), {
    capabilities: ["seo", "theme"],
    configuration: { enabled: true },
    loaded: true,
    name: "site-theme",
    schema: "wpsc.extension",
    schemaVersion: 1,
    siteId: "site-a",
    siteScope: "site",
    source: "runtime",
    version: "2.0.0"
  });
});

test("Site-scoped extensions cannot load without Site Context", async () => {
  const loader = createExtensionLoader({ context: createRuntimeContext(), hooks: createHookSystem() });
  await assert.rejects(() => loader.load({ name: "site-only", siteScope: "site" }), /requires a Site Context/);
  await assert.rejects(() => loader.load({ capabilities: ["unknown"], name: "bad" }), /unsupported capabilities/);
});

test("Extension registration is deterministic and lifecycle unload is explicit", async () => {
  const lifecycle = [];
  const loader = createExtensionLoader({ context: createRuntimeContext(), hooks: createHookSystem() });
  await loader.loadAll([
    { name: "zeta" },
    { name: "alpha", lifecycle: { setup: () => lifecycle.push("setup"), unload: () => lifecycle.push("unload") } }
  ]);
  assert.deepEqual(loader.list().map((item) => item.name), ["alpha", "zeta"]);
  assert.equal(await loader.unload("alpha"), true);
  assert.deepEqual(lifecycle, ["setup", "unload"]);
  assert.equal(loader.has("alpha"), false);
});
