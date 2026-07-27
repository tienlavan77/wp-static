import { randomBytes } from "node:crypto";

export const PROVISIONING_SECRET_VERSION = "1.0";
export const PROVISIONING_SECRET_METADATA_VERSION = 1;
export const PROVISIONING_SECRET_ALGORITHM = "random-256";

export const ProvisioningSecretType = Object.freeze({
  AUTH_BRIDGE_SECRET: "authBridgeSecret",
  SESSION_SECRET: "sessionSecret",
  SITE_SECRET: "siteSecret",
  WEBHOOK_SECRET: "webhookSecret"
});

export const PROVISIONING_SECRET_BYTES = 32;

export function createSecret(bytes = PROVISIONING_SECRET_BYTES) {
  return randomBytes(bytes).toString("base64url");
}

export function createRandomSecretProvider(options = {}) {
  const bytes = options.bytes || PROVISIONING_SECRET_BYTES;

  function create(type, createOptions = {}) {
    const createdAt = createOptions.createdAt || new Date().toISOString();

    return {
      metadata: {
        algorithm: PROVISIONING_SECRET_ALGORITHM,
        createdAt,
        type,
        version: PROVISIONING_SECRET_METADATA_VERSION
      },
      value: createOptions.value || createSecret(bytes)
    };
  }

  function rotate(type) {
    return create(type);
  }

  return {
    create,
    rotate,
    type: "random"
  };
}

function isValidSecretRecord(secret) {
  return Boolean(
    secret
      && typeof secret.value === "string"
      && secret.value.length >= 32
      && secret.metadata
      && Object.values(ProvisioningSecretType).includes(secret.metadata.type)
      && secret.metadata.version === PROVISIONING_SECRET_METADATA_VERSION
      && secret.metadata.algorithm === PROVISIONING_SECRET_ALGORITHM
      && typeof secret.metadata.createdAt === "string"
      && secret.metadata.createdAt.trim() !== ""
  );
}

export function validateProvisioningSecrets(secrets = {}) {
  const errors = [];

  for (const type of Object.values(ProvisioningSecretType)) {
    if (!isValidSecretRecord(secrets[type])) {
      errors.push({
        code: "provision.secret.invalid",
        field: type,
        message: `Provisioning secret is missing, too short, or has invalid metadata: ${type}`
      });
    }
  }

  return {
    errors,
    ok: errors.length === 0
  };
}

export function unwrapProvisioningSecrets(secrets = {}) {
  return Object.fromEntries(
    Object.entries(secrets).map(([type, secret]) => [type, secret?.value])
  );
}

export default function createProvisioningSecrets(options = {}) {
  const provider = options.provider || createRandomSecretProvider({
    bytes: options.bytes
  });
  const secrets = {};

  for (const type of Object.values(ProvisioningSecretType)) {
    secrets[type] = provider.create(type, {
      createdAt: options.createdAt,
      value: options[type]
    });
  }

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
    providerType: provider.type,
    secrets,
    version: PROVISIONING_SECRET_VERSION
  };
}
