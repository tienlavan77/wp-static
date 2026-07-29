import assert from "node:assert/strict";
import test from "node:test";
import createDashboardSourceController from "../src/runtime/createDashboardSourceController.js";

test("Dashboard source actions pass route-owned Site id to shared registration service", async () => {
  const calls = [];
  const controller = createDashboardSourceController({
    sourceRegistrationService: {
      register: async (input) => { calls.push({ action: "register", input }); return { diagnostics: { errors: [], warnings: [] }, ok: true }; },
      testConnection: async (input) => { calls.push({ action: "test", input }); return { diagnostics: { errors: [], warnings: [] }, ok: true }; }
    }
  });
  const input = { source: { endpoint: "https://source.test", type: "wordpress" } };
  assert.equal((await controller.testConnection("company-a", input)).ok, true);
  assert.equal((await controller.register("company-a", input)).ok, true);
  assert.deepEqual(calls.map((call) => call.input.siteId), ["company-a", "company-a"]);
});

test("Dashboard source save requires a passing check for the exact candidate", async () => {
  const calls = [];
  const controller = createDashboardSourceController({
    sourceRegistrationService: {
      register: async (input) => { calls.push({ action: "register", input }); return { diagnostics: { errors: [], warnings: [] }, ok: true }; },
      testConnection: async (input) => { calls.push({ action: "test", input }); return { diagnostics: { errors: [], warnings: [] }, ok: true }; }
    }
  });
  const input = {
    credentials: { applicationPassword: "app-password", wordpressUsername: "admin" },
    source: { endpoint: "https://source.test/", type: "wordpress" }
  };

  const beforeCheck = await controller.register("company-a", input);
  assert.equal(beforeCheck.ok, false);
  assert.equal(beforeCheck.diagnostics.errors[0].code, "runtime.source.save.check_required");

  const checked = await controller.testConnection("company-a", input);
  assert.equal(checked.ok, true);
  assert.deepEqual(checked.connection, { woocommerce: "not_configured", wordpress: "connected" });
  assert.equal((await controller.register("company-a", input)).ok, true);
  assert.deepEqual(calls.map((call) => call.action), ["test", "register"]);
});

test("Dashboard source rejects saving a candidate changed after its check", async () => {
  const controller = createDashboardSourceController({
    sourceRegistrationService: {
      register: async () => ({ ok: true }),
      testConnection: async () => ({ diagnostics: { errors: [], warnings: [] }, ok: true })
    }
  });
  await controller.testConnection("company-a", { source: { endpoint: "https://one.test", type: "wordpress" } });
  const result = await controller.register("company-a", { source: { endpoint: "https://two.test", type: "wordpress" } });
  assert.equal(result.ok, false);
  assert.equal(result.diagnostics.errors[0].code, "runtime.source.save.check_required");
});

test("Dashboard source reports stored WooCommerce credentials as configured after checking", async () => {
  const controller = createDashboardSourceController({
    sourceRegistrationService: {
      register: async () => ({ ok: true }),
      testConnection: async () => ({ configuration: { woocommerce: true }, diagnostics: { errors: [], warnings: [] }, ok: true })
    }
  });
  const result = await controller.testConnection("company-a", { credentials: {}, source: { endpoint: "https://source.test", type: "wordpress" } });
  assert.deepEqual(result.connection, { woocommerce: "connected", wordpress: "connected" });
});
