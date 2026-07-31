import assert from "node:assert/strict";
import test from "node:test";
import createExtensionLoader, {
  EXTENSION_LOADER_VERSION
} from "../framework/src/runtime/extensions/createExtensionLoader.js";
import createHookSystem from "../framework/src/runtime/extensions/createHookSystem.js";
import createRuntimeContext from "../framework/src/runtime/bootstrap/createRuntimeContext.js";

test("createExtensionLoader loads plugin objects with Plugin SDK", async () => {
  const context = createRuntimeContext();
  const hooks = createHookSystem();
  const loader = createExtensionLoader({
    context,
    hooks
  });

  const extension = await loader.load({
    name: "pricing-plugin",
    version: "1.2.3",
    setup(sdk) {
      sdk.services.register("pricing", {
        format(value) {
          return `${value} VND`;
        }
      });
      sdk.hooks.tap("price:label", (label) => `${label} incl. VAT`);
    }
  });

  assert.equal(loader.version, EXTENSION_LOADER_VERSION);
  assert.deepEqual(extension, {
    loaded: true,
    name: "pricing-plugin",
    source: "runtime",
    version: "1.2.3"
  });
  assert.equal(loader.has("pricing-plugin"), true);
  assert.equal(context.services.resolve("pricing").format(12000), "12000 VND");
  assert.equal(await hooks.filter("price:label", "Price", context), "Price incl. VAT");
});

test("createExtensionLoader loads setup functions", async () => {
  const context = createRuntimeContext();
  const hooks = createHookSystem();
  const loader = createExtensionLoader({
    context,
    hooks
  });

  function analytics(sdk) {
    sdk.services.register("analytics", {
      enabled: true
    });
  }

  const extension = await loader.load(analytics);

  assert.equal(extension.name, "analytics");
  assert.equal(context.services.resolve("analytics").enabled, true);
});

test("createExtensionLoader emits extension loaded hooks", async () => {
  const context = createRuntimeContext();
  const hooks = createHookSystem();
  const loader = createExtensionLoader({
    context,
    hooks
  });
  const events = [];

  hooks.tap("extension:loaded", (payload) => {
    events.push(payload.extension.name);
  });

  await loader.loadAll([
    {
      name: "plugin-a"
    },
    {
      name: "plugin-b"
    }
  ]);

  assert.deepEqual(events, ["plugin-a", "plugin-b"]);
  assert.deepEqual(loader.list().map((extension) => extension.name), [
    "plugin-a",
    "plugin-b"
  ]);
});

test("createExtensionLoader rejects duplicate plugins unless replaced", async () => {
  const context = createRuntimeContext();
  const hooks = createHookSystem();
  const loader = createExtensionLoader({
    context,
    hooks
  });

  await loader.load({
    name: "demo"
  });

  await assert.rejects(
    () =>
      loader.load({
        name: "demo"
      }),
    /already loaded/
  );

  await loader.load(
    {
      name: "demo",
      version: "2.0.0"
    },
    {
      replace: true
    }
  );

  assert.deepEqual(loader.list(), [
    {
      loaded: true,
      name: "demo",
      source: "runtime",
      version: "2.0.0"
    }
  ]);
});

test("createExtensionLoader validates required runtime primitives", async () => {
  const context = createRuntimeContext();
  const hooks = createHookSystem();

  assert.throws(() => createExtensionLoader({ hooks }), /runtime context/);
  assert.throws(() => createExtensionLoader({ context }), /hook system/);
  await assert.rejects(
    () =>
      createExtensionLoader({
        context,
        hooks
      }).load({
        setup: "bad"
      }),
    /non-empty string/
  );
});
