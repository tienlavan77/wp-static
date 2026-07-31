import assert from "node:assert/strict";
import test from "node:test";
import createSourceAdapterLoader from "../framework/src/source/createSourceAdapterLoader.js";
import createSourceRegistry from "../framework/src/source/createSourceRegistry.js";
import {
  SOURCE_ADAPTER_REQUIRED_METHODS,
  validateSourceAdapter
} from "../framework/src/source/sourceAdapterContract.js";

function createAdapter() {
  return Object.fromEntries(
    SOURCE_ADAPTER_REQUIRED_METHODS.map((method) => [method, async () => ({ ok: true })])
  );
}

test("source adapter contract requires each lifecycle method", () => {
  const valid = createAdapter();
  const incomplete = { ...valid };
  delete incomplete.registerWebhook;

  assert.equal(validateSourceAdapter(valid).ok, true);
  assert.deepEqual(
    validateSourceAdapter(incomplete).errors.map((error) => error.field),
    ["registerWebhook"]
  );
});

test("source registry registers and resolves adapter factories", () => {
  const registry = createSourceRegistry();
  const create = () => createAdapter();

  assert.equal(registry.register("headless-cms", create), "headless-cms");
  assert.equal(registry.has("headless-cms"), true);
  assert.deepEqual(registry.list(), ["headless-cms"]);
  assert.equal(registry.resolve("headless-cms"), create);
  assert.throws(() => registry.register("headless-cms", create), /already registered/);
  assert.throws(() => registry.resolve("missing"), (error) => error.code === "source.adapter.not_found");
});

test("source adapter loader validates adapters without running source lifecycle methods", () => {
  const calls = [];
  const registry = createSourceRegistry({
    adapters: [{
      create: (options) => {
        calls.push(options);
        return createAdapter();
      },
      type: "rest"
    }]
  });
  const adapter = createSourceAdapterLoader({ registry }).load("rest", { endpoint: "https://example.test" });

  assert.equal(typeof adapter.initialize, "function");
  assert.deepEqual(calls, [{ endpoint: "https://example.test" }]);
});

test("source adapter loader rejects factories that violate the contract", () => {
  const registry = createSourceRegistry({
    adapters: [{ create: () => ({}), type: "invalid" }]
  });

  assert.throws(
    () => createSourceAdapterLoader({ registry }).load("invalid"),
    (error) => error.code === "source.adapter.contract.invalid"
  );
});
