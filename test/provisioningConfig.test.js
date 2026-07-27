import assert from "node:assert/strict";
import test from "node:test";
import createProvisioningSecrets from "../src/provision/createProvisioningSecrets.js";
import createProvisioningConfig, {
  PROVISIONING_CONFIG_SCHEMA,
  PROVISIONING_CONFIG_VERSION,
  validateProvisioningConfig
} from "../src/provision/createProvisioningConfig.js";

test("createProvisioningConfig creates an isolated, versioned provisioning config", () => {
  const source = { type: "wordpress", url: "https://example.test" };
  const environment = { node: { minimumMajor: 20 } };
  const secrets = createProvisioningSecrets({
    createdAt: "2026-07-27T00:00:00.000Z"
  }).secrets;
  const result = createProvisioningConfig({
    createdAt: "2026-07-27T00:00:00.000Z",
    environment,
    secrets,
    site: { id: "company-a", name: "Company A" },
    source
  });

  assert.equal(result.ok, true);
  assert.equal(result.config.schema, PROVISIONING_CONFIG_SCHEMA);
  assert.equal(result.config.version, PROVISIONING_CONFIG_VERSION);
  assert.deepEqual(result.diagnostics, { errors: [], warnings: [] });
  assert.notEqual(result.config.environment, environment);
  assert.notEqual(result.config.source, source);
  assert.notEqual(result.config.secrets, secrets);

  source.url = "https://changed.example.test";
  assert.equal(result.config.source.url, "https://example.test");
});

test("createProvisioningConfig returns diagnostics for incomplete configuration", () => {
  const result = createProvisioningConfig({
    environment: null,
    secrets: null,
    site: { id: "", name: "" },
    source: null
  });

  assert.equal(result.ok, false);
  assert.deepEqual(
    result.diagnostics.errors.map((error) => error.code),
    [
      "provision.config.site.id.required",
      "provision.config.site.name.required",
      "provision.config.environment.invalid",
      "provision.config.source.invalid",
      "provision.config.secrets.invalid"
    ]
  );
  assert.equal(validateProvisioningConfig(result.config).ok, false);
});
