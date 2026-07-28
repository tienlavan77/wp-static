import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createRandomSecretProvider, ProvisioningSecretType } from "../provision/createProvisioningSecrets.js";

export const WEBHOOK_REGISTRATION_CONTROLLER_VERSION = "1.0";
export const WEBHOOK_RUNTIME_SCHEMA = "runtime-webhook";
export const WEBHOOK_RUNTIME_SCHEMA_VERSION = 1;

function diagnostic(code, message) { return { code, message, severity: "error" }; }

async function readWebhookConfiguration(configPath) {
  try { return JSON.parse(await readFile(configPath, "utf8")); } catch (error) { if (error.code === "ENOENT") return null; throw error; }
}

export default function createWebhookRegistrationController(options = {}) {
  const repository = options.repository;
  const webhookActivationService = options.webhookActivationService;
  const secretProvider = options.secretProvider || createRandomSecretProvider();
  const webhookBaseUrl = String(options.webhookBaseUrl || "").replace(/\/$/, "");
  if (!repository || typeof repository.readMetadata !== "function" || typeof repository.resolveSiteRoot !== "function") throw new TypeError("Webhook Registration requires a Site Repository.");
  if (!webhookActivationService || typeof webhookActivationService.activate !== "function") throw new TypeError("Webhook Registration requires Webhook Activation Service.");
  if (!webhookBaseUrl) throw new TypeError("Webhook Registration requires webhookBaseUrl.");

  async function register(siteId, input = {}) {
    try {
      const metadata = await repository.readMetadata(siteId);
      const configPath = path.join(repository.resolveSiteRoot(siteId), "config", "webhook.json");
      const existing = await readWebhookConfiguration(configPath);
      const secret = existing?.secret || secretProvider.create(ProvisioningSecretType.WEBHOOK_SECRET);
      const secretValue = typeof secret === "string" ? secret : secret.value;
      const secretMetadata = typeof secret === "string" ? null : secret.metadata;
      const webhookUrl = `${webhookBaseUrl}/${metadata.uuid}`;
      const activation = await webhookActivationService.activate({ adapterOptions: input.adapterOptions, siteId, webhookUrl });
      if (!activation.ok) return activation;
      const configuration = {
        schema: WEBHOOK_RUNTIME_SCHEMA,
        schemaVersion: WEBHOOK_RUNTIME_SCHEMA_VERSION,
        secret: secretValue,
        secretMetadata,
        siteId,
        uuid: metadata.uuid,
        webhookId: activation.metadata.webhookId,
        webhookStatus: activation.metadata.webhookStatus,
        webhookUrl
      };
      await mkdir(path.dirname(configPath), { recursive: true });
      await writeFile(configPath, `${JSON.stringify(configuration, null, 2)}\n`, "utf8");
      return { configurationPath: configPath, diagnostics: activation.diagnostics, metadata: activation.metadata, ok: true, webhook: { status: configuration.webhookStatus, url: webhookUrl } };
    } catch (error) {
      return { diagnostics: { errors: [diagnostic("runtime.webhook.registration.failed", error.message)], warnings: [] }, ok: false };
    }
  }
  return Object.freeze({ register, version: WEBHOOK_REGISTRATION_CONTROLLER_VERSION });
}
