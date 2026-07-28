export const WebhookActivationEvent = Object.freeze({
  FAILED: "webhook.failed",
  REGISTERED: "webhook.registered",
  REMOVED: "webhook.removed"
});

function createDiagnostic(code, message) {
  return { code, message, severity: "error" };
}

function normalizeResult(result, fallbackCode, fallbackMessage) {
  if (result?.ok === true) {
    return { diagnostics: result.diagnostics || { errors: [], warnings: [] }, ok: true, result };
  }

  return {
    diagnostics: result?.diagnostics || {
      errors: [createDiagnostic(fallbackCode, fallbackMessage)],
      warnings: []
    },
    ok: false,
    result: null
  };
}

export default function createWebhookActivationService(options = {}) {
  const adapterLoader = options.adapterLoader;
  const repository = options.repository;
  const onEvent = typeof options.onEvent === "function" ? options.onEvent : null;

  if (!adapterLoader || typeof adapterLoader.load !== "function") {
    throw new TypeError("Webhook activation requires an Adapter Loader.");
  }

  if (!repository || typeof repository.readSourceMetadata !== "function" || typeof repository.writeSourceMetadata !== "function") {
    throw new TypeError("Webhook activation requires a Site Repository.");
  }

  function emit(events, type, payload = {}) {
    const event = { payload, type };
    events.push(event);
    onEvent?.(event);
    return event;
  }

  async function load(siteId, adapterOptions) {
    try {
      const metadata = await repository.readSourceMetadata(siteId);
      const adapter = adapterLoader.load(metadata.sourceType, adapterOptions || {});
      return { adapter, metadata, ok: true };
    } catch (error) {
      return {
        diagnostics: {
          errors: [createDiagnostic(error.code || "webhook.activation.source.unavailable", error.message)],
          warnings: []
        },
        ok: false
      };
    }
  }

  async function run(adapter, method, input, fallbackCode, fallbackMessage) {
    try {
      return normalizeResult(await adapter[method](input), fallbackCode, fallbackMessage);
    } catch (error) {
      return {
        diagnostics: {
          errors: [createDiagnostic(fallbackCode, error.message)],
          warnings: []
        },
        ok: false,
        result: null
      };
    }
  }

  async function activate(input = {}) {
    const events = [];
    const siteId = String(input.siteId || "").trim();
    if (!siteId || typeof input.webhookUrl !== "string" || input.webhookUrl.trim() === "") {
      const diagnostics = { errors: [createDiagnostic("webhook.activation.input.invalid", "Site id and webhook URL are required.")], warnings: [] };
      emit(events, WebhookActivationEvent.FAILED, { diagnostics, siteId });
      return { diagnostics, events, ok: false };
    }

    const loaded = await load(siteId, input.adapterOptions);
    if (!loaded.ok) {
      emit(events, WebhookActivationEvent.FAILED, { diagnostics: loaded.diagnostics, siteId });
      return { diagnostics: loaded.diagnostics, events, ok: false };
    }

    const registered = await run(
      loaded.adapter,
      "registerWebhook",
      { endpoint: loaded.metadata.endpoint, siteId, webhookUrl: input.webhookUrl.trim() },
      "webhook.activation.register.failed",
      "Webhook registration failed."
    );
    const webhookId = registered.result?.webhookId;
    if (!registered.ok || typeof webhookId !== "string" || webhookId.trim() === "") {
      const diagnostics = registered.ok
        ? { errors: [createDiagnostic("webhook.activation.id.missing", "Webhook registration did not return a webhook id.")], warnings: [] }
        : registered.diagnostics;
      emit(events, WebhookActivationEvent.FAILED, { diagnostics, siteId });
      return { diagnostics, events, ok: false };
    }

    const verified = await run(
      loaded.adapter,
      "verifyWebhook",
      { endpoint: loaded.metadata.endpoint, siteId, webhookId },
      "webhook.activation.verify.failed",
      "Webhook verification failed."
    );
    if (!verified.ok) {
      emit(events, WebhookActivationEvent.FAILED, { diagnostics: verified.diagnostics, siteId, webhookId });
      return { diagnostics: verified.diagnostics, events, ok: false };
    }

    const metadata = {
      ...loaded.metadata,
      webhookId,
      webhookRegisteredAt: input.registeredAt || new Date().toISOString(),
      webhookStatus: "verified"
    };
    try {
      const write = await repository.writeSourceMetadata(siteId, metadata);
      emit(events, WebhookActivationEvent.REGISTERED, { siteId, webhookId });
      return { diagnostics: { errors: [], warnings: [] }, events, metadata, ok: true, path: write.path };
    } catch (error) {
      const diagnostics = { errors: [createDiagnostic("webhook.activation.persistence.failed", error.message)], warnings: [] };
      emit(events, WebhookActivationEvent.FAILED, { diagnostics, siteId, webhookId });
      return { diagnostics, events, ok: false };
    }
  }

  async function remove(input = {}) {
    const events = [];
    const siteId = String(input.siteId || "").trim();
    if (!siteId) {
      const diagnostics = { errors: [createDiagnostic("webhook.activation.site_id.required", "Site id is required.")], warnings: [] };
      emit(events, WebhookActivationEvent.FAILED, { diagnostics, siteId });
      return { diagnostics, events, ok: false };
    }

    const loaded = await load(siteId, input.adapterOptions);
    if (!loaded.ok) {
      emit(events, WebhookActivationEvent.FAILED, { diagnostics: loaded.diagnostics, siteId });
      return { diagnostics: loaded.diagnostics, events, ok: false };
    }
    if (typeof loaded.metadata.webhookId !== "string" || loaded.metadata.webhookId.trim() === "") {
      const diagnostics = { errors: [createDiagnostic("webhook.activation.not_registered", "No active webhook is registered for this source.")], warnings: [] };
      emit(events, WebhookActivationEvent.FAILED, { diagnostics, siteId });
      return { diagnostics, events, ok: false };
    }

    const removed = await run(
      loaded.adapter,
      "unregisterWebhook",
      { endpoint: loaded.metadata.endpoint, siteId, webhookId: loaded.metadata.webhookId },
      "webhook.activation.remove.failed",
      "Webhook removal failed."
    );
    if (!removed.ok) {
      emit(events, WebhookActivationEvent.FAILED, { diagnostics: removed.diagnostics, siteId });
      return { diagnostics: removed.diagnostics, events, ok: false };
    }

    const metadata = {
      ...loaded.metadata,
      webhookId: null,
      webhookStatus: "removed"
    };
    try {
      const write = await repository.writeSourceMetadata(siteId, metadata);
      emit(events, WebhookActivationEvent.REMOVED, { siteId });
      return { diagnostics: { errors: [], warnings: [] }, events, metadata, ok: true, path: write.path };
    } catch (error) {
      const diagnostics = { errors: [createDiagnostic("webhook.activation.persistence.failed", error.message)], warnings: [] };
      emit(events, WebhookActivationEvent.FAILED, { diagnostics, siteId });
      return { diagnostics, events, ok: false };
    }
  }

  return { activate, remove };
}
