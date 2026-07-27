import assert from "node:assert/strict";
import test from "node:test";
import createProvisioningSecrets, {
  PROVISIONING_SECRET_BYTES,
  PROVISIONING_SECRET_VERSION,
  ProvisioningSecretName,
  createSecret,
  validateProvisioningSecrets
} from "../src/provision/createProvisioningSecrets.js";

test("createSecret creates URL-safe random secrets", () => {
  const secret = createSecret(PROVISIONING_SECRET_BYTES);

  assert.equal(typeof secret, "string");
  assert.equal(secret.length >= 32, true);
  assert.match(secret, /^[A-Za-z0-9_-]+$/);
});

test("createProvisioningSecrets creates all site-local secrets", () => {
  const result = createProvisioningSecrets();

  assert.equal(result.version, PROVISIONING_SECRET_VERSION);
  assert.equal(result.ok, true);
  assert.deepEqual(Object.keys(result.secrets).sort(), Object.values(ProvisioningSecretName).sort());
  assert.equal(validateProvisioningSecrets(result.secrets).ok, true);
  assert.notEqual(result.secrets.siteSecret, result.secrets.webhookSecret);
});

test("createProvisioningSecrets validates provided secrets", () => {
  const result = createProvisioningSecrets({
    authBridgeSecret: "short",
    sessionSecret: "short",
    siteSecret: "short",
    webhookSecret: "short"
  });

  assert.equal(result.ok, false);
  assert.deepEqual(
    result.diagnostics.errors.map((error) => error.code),
    [
      "provision.secret.invalid",
      "provision.secret.invalid",
      "provision.secret.invalid",
      "provision.secret.invalid"
    ]
  );
});
