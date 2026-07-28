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
