import deepFreeze from "../shared/deepFreeze.js";

export const SETUP_SERVICE_VERSION = "1.0";

export const SetupClient = Object.freeze({
  BROWSER: "browser",
  CLI: "cli",
  DASHBOARD: "dashboard"
});

export const SetupEvent = Object.freeze({
  CONTEXT_CREATED: "setup.context.created",
  CONTEXT_REJECTED: "setup.context.rejected"
});

function createDiagnostic(code, message) {
  return { code, message, severity: "error" };
}

function normalizeClient(client) {
  return String(client || "").trim().toLowerCase();
}

export function validateSetupContext(context = {}) {
  const errors = [];

  if (!Object.values(SetupClient).includes(context.client)) {
    errors.push(createDiagnostic(
      "setup.context.client.invalid",
      "Setup context client must be browser, cli, or dashboard."
    ));
  }

  if (typeof context.siteId !== "string" || context.siteId.trim() === "") {
    errors.push(createDiagnostic(
      "setup.context.site_id.required",
      "Setup context site id is required."
    ));
  }

  return { errors, ok: errors.length === 0 };
}

export default function createSetupService(options = {}) {
  const onEvent = typeof options.onEvent === "function" ? options.onEvent : null;

  function emit(events, type, payload = {}) {
    const event = deepFreeze({
      payload,
      timestamp: payload.timestamp || null,
      type
    });
    events.push(event);
    onEvent?.(event);
    return event;
  }

  function createContext(input = {}) {
    const events = [];
    const context = deepFreeze({
      client: normalizeClient(input.client),
      siteId: typeof input.siteId === "string" ? input.siteId.trim() : ""
    });
    const validation = validateSetupContext(context);

    if (!validation.ok) {
      emit(events, SetupEvent.CONTEXT_REJECTED, {
        errors: validation.errors,
        siteId: context.siteId
      });
      return {
        context,
        diagnostics: { errors: validation.errors, warnings: [] },
        events,
        ok: false
      };
    }

    emit(events, SetupEvent.CONTEXT_CREATED, {
      client: context.client,
      siteId: context.siteId
    });
    return {
      context,
      diagnostics: { errors: [], warnings: [] },
      events,
      ok: true
    };
  }

  return { createContext, version: SETUP_SERVICE_VERSION };
}
