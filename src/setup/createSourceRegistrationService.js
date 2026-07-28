export const SOURCE_METADATA_SCHEMA = "source-metadata";
export const SOURCE_METADATA_SCHEMA_VERSION = 1;

export const SourceRegistrationEvent = Object.freeze({
  CONNECTED: "source.connected",
  FAILED: "source.failed",
  VALIDATED: "source.validated"
});

function createDiagnostic(code, message, detail = null) {
  return { code, detail, message, severity: "error" };
}

function normalizeResult(result, fallbackCode, fallbackMessage) {
  if (result?.ok === true) {
    return {
      diagnostics: result.diagnostics || { errors: [], warnings: [] },
      ok: true
    };
  }

  return {
    diagnostics: result?.diagnostics || {
      errors: [createDiagnostic(fallbackCode, fallbackMessage)],
      warnings: []
    },
    ok: false
  };
}

async function runAdapterStep(adapter, method, input, fallbackCode, fallbackMessage) {
  try {
    return normalizeResult(await adapter[method](input), fallbackCode, fallbackMessage);
  } catch (error) {
    return {
      diagnostics: {
        errors: [createDiagnostic(fallbackCode, error.message)],
        warnings: []
      },
      ok: false
    };
  }
}

function normalizeSourceMetadata(metadata) {
  const sourceType = typeof metadata?.sourceType === "string" ? metadata.sourceType.trim().toLowerCase() : "";
  const adapterVersion = typeof metadata?.adapterVersion === "string" ? metadata.adapterVersion.trim() : "";
  const capabilities = Array.isArray(metadata?.capabilities)
    ? metadata.capabilities.filter((capability) => typeof capability === "string").sort()
    : null;

  if (!sourceType || !adapterVersion || !capabilities) {
    return null;
  }

  return { adapterVersion, capabilities, sourceType };
}

export default function createSourceRegistrationService(options = {}) {
  const adapterLoader = options.adapterLoader;
  const repository = options.repository;
  const onEvent = typeof options.onEvent === "function" ? options.onEvent : null;

  if (!adapterLoader || typeof adapterLoader.load !== "function") {
    throw new TypeError("Source registration requires an Adapter Loader.");
  }

  if (!repository || typeof repository.writeSourceMetadata !== "function") {
    throw new TypeError("Source registration requires a Site Repository.");
  }

  function emit(events, type, payload = {}) {
    const event = { payload, type };
    events.push(event);
    onEvent?.(event);
    return event;
  }

  async function register(input = {}) {
    const events = [];
    const siteId = String(input.siteId || "").trim();
    const sourceType = String(input.source?.type || "").trim().toLowerCase();
    const endpoint = typeof input.source?.endpoint === "string" ? input.source.endpoint.trim() : "";

    if (!siteId || !sourceType || !endpoint) {
      const diagnostics = {
        errors: [createDiagnostic(
          "source.registration.input.invalid",
          "Site id, source type, and endpoint are required."
        )],
        warnings: []
      };
      emit(events, SourceRegistrationEvent.FAILED, { diagnostics, siteId, sourceType });
      return { diagnostics, events, ok: false };
    }

    let adapter;
    try {
      adapter = adapterLoader.load(sourceType, input.adapterOptions || {});
    } catch (error) {
      const diagnostics = {
        errors: [createDiagnostic(error.code || "source.registration.adapter.failed", error.message)],
        warnings: []
      };
      emit(events, SourceRegistrationEvent.FAILED, { diagnostics, siteId, sourceType });
      return { diagnostics, events, ok: false };
    }

    const initialized = await runAdapterStep(
      adapter,
      "initialize",
      { endpoint, siteId },
      "source.registration.initialize.failed",
      "Source adapter initialization failed."
    );
    if (!initialized.ok) {
      emit(events, SourceRegistrationEvent.FAILED, { diagnostics: initialized.diagnostics, siteId, sourceType });
      return { diagnostics: initialized.diagnostics, events, ok: false };
    }

    const validated = await runAdapterStep(
      adapter,
      "validate",
      { credentials: input.credentials, endpoint },
      "source.registration.validation.failed",
      "Source validation failed."
    );
    if (!validated.ok) {
      emit(events, SourceRegistrationEvent.FAILED, { diagnostics: validated.diagnostics, siteId, sourceType });
      return { diagnostics: validated.diagnostics, events, ok: false };
    }
    emit(events, SourceRegistrationEvent.VALIDATED, { siteId, sourceType });

    const health = await runAdapterStep(
      adapter,
      "healthCheck",
      { endpoint },
      "source.registration.health.failed",
      "Source health check failed."
    );
    if (!health.ok) {
      emit(events, SourceRegistrationEvent.FAILED, { diagnostics: health.diagnostics, siteId, sourceType });
      return { diagnostics: health.diagnostics, events, ok: false };
    }
    emit(events, SourceRegistrationEvent.CONNECTED, { siteId, sourceType });

    let adapterMetadata;
    try {
      adapterMetadata = normalizeSourceMetadata(await adapter.getMetadata());
    } catch (error) {
      const diagnostics = {
        errors: [createDiagnostic("source.registration.metadata.failed", error.message)],
        warnings: []
      };
      emit(events, SourceRegistrationEvent.FAILED, { diagnostics, siteId, sourceType });
      return { diagnostics, events, ok: false };
    }
    if (!adapterMetadata || adapterMetadata.sourceType !== sourceType) {
      const diagnostics = {
        errors: [createDiagnostic(
          "source.registration.metadata.invalid",
          "Source adapter metadata must provide matching sourceType, adapterVersion, and capabilities."
        )],
        warnings: []
      };
      emit(events, SourceRegistrationEvent.FAILED, { diagnostics, siteId, sourceType });
      return { diagnostics, events, ok: false };
    }

    const metadata = {
      ...adapterMetadata,
      endpoint,
      registeredAt: input.registeredAt || new Date().toISOString(),
      schema: SOURCE_METADATA_SCHEMA,
      schemaVersion: SOURCE_METADATA_SCHEMA_VERSION
    };
    let write;
    try {
      write = await repository.writeSourceMetadata(siteId, metadata);
    } catch (error) {
      const diagnostics = {
        errors: [createDiagnostic("source.registration.persistence.failed", error.message)],
        warnings: []
      };
      emit(events, SourceRegistrationEvent.FAILED, { diagnostics, siteId, sourceType });
      return { diagnostics, events, ok: false };
    }

    return {
      diagnostics: { errors: [], warnings: [] },
      events,
      metadata,
      ok: true,
      path: write.path
    };
  }

  async function testConnection(input = {}) {
    const events = [];
    const siteId = String(input.siteId || "").trim();
    const sourceType = String(input.source?.type || "").trim().toLowerCase();
    const endpoint = typeof input.source?.endpoint === "string" ? input.source.endpoint.trim() : "";
    if (!siteId || !sourceType || !endpoint) {
      const diagnostics = { errors: [createDiagnostic("source.connection.input.invalid", "Site id, source type, and endpoint are required.")], warnings: [] };
      emit(events, SourceRegistrationEvent.FAILED, { diagnostics, siteId, sourceType });
      return { diagnostics, events, ok: false };
    }
    let adapter;
    try {
      adapter = adapterLoader.load(sourceType, input.adapterOptions || {});
    } catch (error) {
      const diagnostics = { errors: [createDiagnostic(error.code || "source.connection.adapter.failed", error.message)], warnings: [] };
      emit(events, SourceRegistrationEvent.FAILED, { diagnostics, siteId, sourceType });
      return { diagnostics, events, ok: false };
    }
    const initialized = await runAdapterStep(adapter, "initialize", { endpoint, siteId }, "source.connection.initialize.failed", "Source adapter initialization failed.");
    if (!initialized.ok) return { diagnostics: initialized.diagnostics, events, ok: false };
    const validated = await runAdapterStep(adapter, "validate", { credentials: input.credentials, endpoint }, "source.connection.validation.failed", "Source validation failed.");
    if (!validated.ok) return { diagnostics: validated.diagnostics, events, ok: false };
    const health = await runAdapterStep(adapter, "healthCheck", { endpoint }, "source.connection.health.failed", "Source health check failed.");
    if (!health.ok) return { diagnostics: health.diagnostics, events, ok: false };
    return { diagnostics: { errors: [], warnings: [] }, events, ok: true };
  }

  return { register, testConnection };
}
