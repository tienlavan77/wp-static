import assert from "node:assert/strict";
import test from "node:test";
import createEnvironmentConfigurationService from "../framework/src/product/createEnvironmentConfigurationService.js";

test("Environment Configuration applies safe profile defaults and serializes secret references only", () => {
  const service = createEnvironmentConfigurationService();
  const config = service.create({ environment: "production", secretReferences: { WPSC_AUTH_BRIDGE_SECRET: "WPSC_AUTH_BRIDGE_SECRET" } });
  assert.equal(config.runtime.host, "0.0.0.0");
  assert.equal(config.runtime.port, 8787);
  assert.deepEqual(config.secretReferences.WPSC_AUTH_BRIDGE_SECRET, { name: "WPSC_AUTH_BRIDGE_SECRET", store: "environment" });
  assert.equal(JSON.stringify(config).includes("actual-secret"), false);
  assert.equal(Object.isFrozen(config), true);
});

test("Environment Configuration maps supported variables and ignores direct secrets", () => {
  const service = createEnvironmentConfigurationService();
  const result = service.fromEnvironment({ WPSC_ENVIRONMENT: "development", WPSC_RUNTIME_PORT: "8790", WPSC_AUTH_BRIDGE_SECRET: "actual-secret", WPSC_AUTH_BRIDGE_SECRET_REF: "WPSC_AUTH_BRIDGE_SECRET" });
  assert.equal(result.config.environment, "development");
  assert.equal(result.config.runtime.port, 8790);
  assert.equal(result.config.secretReferences.WPSC_AUTH_BRIDGE_SECRET.name, "WPSC_AUTH_BRIDGE_SECRET");
  assert.equal(JSON.stringify(result.config).includes("actual-secret"), false);
  assert.equal(result.diagnostics.warnings[0].code, "environment.secret.direct_ignored");
});
