import deepFreeze from "../shared/deepFreeze.js";
import createSetupSessionManager from "./createSetupSessionManager.js";

export const SETUP_SERVICE_VERSION = "1.0";

export const SetupClient = Object.freeze({
  BROWSER: "browser",
  CLI: "cli",
  DASHBOARD: "dashboard"
});

export const SetupEvent = Object.freeze({
  CONTEXT_CREATED: "setup.context.created",
  CONTEXT_REJECTED: "setup.context.rejected",
  SESSION_CREATED: "setup.session.created",
  SESSION_ENDED: "setup.session.ended",
  STARTED: "setup.started"
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
  const sessionManager = createSetupSessionManager({
    createId: options.createSessionId,
    now: options.now,
    validateContext: validateSetupContext
  });

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

  function start(input = {}) {
    const events = [];
    emit(events, SetupEvent.STARTED, {
      client: normalizeClient(input.client),
      siteId: typeof input.siteId === "string" ? input.siteId.trim() : ""
    });

    const contextResult = createContext(input);
    events.push(...contextResult.events);

    if (!contextResult.ok) {
      return {
        ...contextResult,
        events
      };
    }

    let session;
    try {
      session = sessionManager.create(contextResult.context);
    } catch (error) {
      return {
        ...contextResult,
        diagnostics: {
          errors: [{
            code: error.code || "setup.session.failed",
            message: error.message,
            severity: "error"
          }],
          warnings: []
        },
        events,
        ok: false
      };
    }
    emit(events, SetupEvent.SESSION_CREATED, {
      sessionId: session.id,
      siteId: session.context.siteId
    });
    return {
      ...contextResult,
      events,
      session
    };
  }

  function getSession(sessionId) {
    try {
      return { diagnostics: { errors: [], warnings: [] }, ok: true, session: sessionManager.get(sessionId) };
    } catch (error) {
      return {
        diagnostics: {
          errors: [{
            code: error.code || "setup.session.failed",
            message: error.message,
            severity: "error"
          }],
          warnings: []
        },
        ok: false
      };
    }
  }

  function endSession(sessionId) {
    const events = [];

    try {
      const session = sessionManager.end(sessionId);
      emit(events, SetupEvent.SESSION_ENDED, {
        sessionId: session.id,
        siteId: session.context.siteId
      });
      return { diagnostics: { errors: [], warnings: [] }, events, ok: true, session };
    } catch (error) {
      return {
        diagnostics: {
          errors: [{
            code: error.code || "setup.session.failed",
            message: error.message,
            severity: "error"
          }],
          warnings: []
        },
        events,
        ok: false
      };
    }
  }

  return {
    createContext,
    endSession,
    getSession,
    start,
    version: SETUP_SERVICE_VERSION
  };
}
