import assert from "node:assert/strict";
import test from "node:test";
import createOperationsAuthorizationService, { OperationsCapability } from "../framework/src/security/createOperationsAuthorizationService.js";

test("Operations Authorization enforces operator capability and exact Site scope", async () => {
  const events = [];
  const authorization = createOperationsAuthorizationService({
    audit: { audit: async (event) => events.push(event) },
    grants: [{ actorId: "operator-a", capabilities: [OperationsCapability.BACKUP, OperationsCapability.SITE_INSPECTION], siteIds: ["alpha"] }]
  });
  const allowed = await authorization.authorize({ capability: OperationsCapability.BACKUP, operator: { id: "operator-a" }, siteId: "alpha" });
  const denied = await authorization.authorize({ capability: OperationsCapability.BACKUP, operator: { id: "operator-a" }, siteId: "beta" });

  assert.equal(allowed.allowed, true);
  assert.equal(denied.allowed, false);
  assert.equal(denied.diagnostics.errors[0].code, "operations.authorization.denied");
  assert.equal(events.length, 2);
  assert.equal(events[1].outcome, "failed");
});

test("Operations Authorization is deny-by-default and blocks execution", async () => {
  const authorization = createOperationsAuthorizationService({ audit: { audit: async () => undefined } });
  let called = false;
  const result = await authorization.execute({ capability: OperationsCapability.DEPLOYMENT, operator: { id: "operator-a" }, siteId: "alpha" }, () => { called = true; });
  assert.equal(result.allowed, false);
  assert.equal(called, false);
});
