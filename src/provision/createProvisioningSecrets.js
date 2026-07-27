import { randomBytes } from "node:crypto";

export const PROVISIONING_SECRET_VERSION = "1.0";

export const ProvisioningSecretName = Object.freeze({
  AUTH_BRIDGE_SECRET: "authBridgeSecret",
  SESSION_SECRET: "sessionSecret",
  SITE_SECRET: "siteSecret",
  WEBHOOK_SECRET: "webhookSecret"
});

export const PROVISIONING_SECRET_BYTES = 32;

export function createSecret(bytes = PROVISIONING_SECRET_BYTES) {
  return randomBytes(bytes).toString("base64url");
}

export function validateProvisioningSecrets(secrets = {}) {
  const errors = [];

  for (const name of Object.values(ProvisioningSecretName)) {
    if (typeof secrets[name] !== "string" || secrets[name].length < 32) {
      errors.push({
        code: "provision.secret.invalid",
        field: name,
        message: `Provisioning secret is missing or too short: ${name}`
      });
    }
  }

  return {
    errors,
    ok: errors.length === 0
  };
}

export default function createProvisioningSecrets(options = {}) {
  const secrets = {
    [ProvisioningSecretName.AUTH_BRIDGE_SECRET]:
      options.authBridgeSecret || createSecret(options.bytes),
    [ProvisioningSecretName.SESSION_SECRET]:
      options.sessionSecret || createSecret(options.bytes),
    [ProvisioningSecretName.SITE_SECRET]:
      options.siteSecret || createSecret(options.bytes),
    [ProvisioningSecretName.WEBHOOK_SECRET]:
      options.webhookSecret || createSecret(options.bytes)
  };
  const validation = validateProvisioningSecrets(secrets);

  if (!validation.ok) {
    return {
      diagnostics: {
        errors: validation.errors,
        warnings: []
      },
      ok: false,
      secrets
    };
  }

  return {
    diagnostics: {
      errors: [],
      warnings: []
    },
    ok: true,
    secrets,
    version: PROVISIONING_SECRET_VERSION
  };
}
