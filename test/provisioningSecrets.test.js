import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import createProvisioningSecrets, {
  PROVISIONING_SECRET_ALGORITHM,
  PROVISIONING_SECRET_BYTES,
  PROVISIONING_SECRET_METADATA_VERSION,
  PROVISIONING_SECRET_VERSION,
  ProvisioningSecretType,
  createRandomSecretProvider,
  createSecret,
  unwrapProvisioningSecrets,
  validateProvisioningSecrets
} from "../src/provision/createProvisioningSecrets.js";

test("createSecret creates URL-safe random secrets with CSPRNG", () => {
  const secret = createSecret(PROVISIONING_SECRET_BYTES);

  assert.equal(typeof secret, "string");
  assert.equal(secret.length >= 32, true);
  assert.match(secret, /^[A-Za-z0-9_-]+$/);
});

test("createRandomSecretProvider creates metadata-rich secret records", () => {
  const provider = createRandomSecretProvider();
  const secret = provider.create(ProvisioningSecretType.WEBHOOK_SECRET, {
    createdAt: "2026-07-27T00:00:00.000Z"
  });

  assert.equal(provider.type, "random");
  assert.equal(secret.metadata.type, ProvisioningSecretType.WEBHOOK_SECRET);
  assert.equal(secret.metadata.version, PROVISIONING_SECRET_METADATA_VERSION);
  assert.equal(secret.metadata.algorithm, PROVISIONING_SECRET_ALGORITHM);
  assert.equal(secret.metadata.createdAt, "2026-07-27T00:00:00.000Z");
  assert.equal(typeof secret.value, "string");
});

test("createRandomSecretProvider exposes rotate contract", () => {
  const provider = createRandomSecretProvider();
  const first = provider.create(ProvisioningSecretType.WEBHOOK_SECRET);
  const rotated = provider.rotate(ProvisioningSecretType.WEBHOOK_SECRET);

  assert.equal(rotated.metadata.type, ProvisioningSecretType.WEBHOOK_SECRET);
  assert.notEqual(rotated.value, first.value);
});

test("createProvisioningSecrets creates all site-local secrets", () => {
  const result = createProvisioningSecrets({
    createdAt: "2026-07-27T00:00:00.000Z"
  });

  assert.equal(result.version, PROVISIONING_SECRET_VERSION);
  assert.equal(result.ok, true);
  assert.deepEqual(Object.keys(result.secrets).sort(), Object.values(ProvisioningSecretType).sort());
  assert.equal(validateProvisioningSecrets(result.secrets).ok, true);

  const values = unwrapProvisioningSecrets(result.secrets);
  assert.notEqual(values.siteSecret, values.webhookSecret);
  assert.equal(result.secrets.webhookSecret.metadata.type, ProvisioningSecretType.WEBHOOK_SECRET);
});

test("createProvisioningSecrets validates provided secrets and metadata", () => {
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

test("secret module does not use Math.random", async () => {
  const source = await readFile(new URL("../src/provision/createProvisioningSecrets.js", import.meta.url), "utf8");

  assert.equal(source.includes("Math.random"), false);
  assert.equal(source.includes("randomBytes"), true);
});
