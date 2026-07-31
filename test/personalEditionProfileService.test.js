import assert from "node:assert/strict";
import test from "node:test";
import createPersonalEditionProfileService from "../framework/src/product/createPersonalEditionProfileService.js";

test("Personal Edition Profile keeps Full Core and applies small-scale defaults", async () => {
  const registry = { listSites: async () => [] };
  const service = createPersonalEditionProfileService({ registry });
  const profile = service.create();
  const assessment = await service.assess({ profile, operatorCount: 1 });
  assert.equal(profile.features.core, "full");
  assert.equal(profile.limits.sites, 1);
  assert.equal(profile.limits.operators, 1);
  assert.equal(assessment.allowed, true);
  assert.deepEqual(assessment.onboarding, ["bootstrap", "create-site", "connect-source", "build-site", "deploy-site"]);
});

test("Personal Edition Profile reports operational limits without licensing", async () => {
  const registry = { listSites: async () => [{ siteId: "alpha" }] };
  const service = createPersonalEditionProfileService({ registry });
  const assessment = await service.assess({ operatorCount: 2 });
  assert.equal(assessment.allowed, false);
  assert.deepEqual(assessment.diagnostics.warnings.map((warning) => warning.code).sort(), ["profile.personal.operator_limit.reached", "profile.personal.site_limit.reached"]);
  assert.equal(JSON.stringify(assessment).match(/license|entitlement/i), null);
});
