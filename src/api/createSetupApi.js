import { SetupClient } from "../setup/createSetupService.js";

export const SETUP_API_VERSION = "1.0";

export const SetupApiRoute = Object.freeze({
  ADVANCE: "POST /setup/sessions/:sessionId/advance",
  END: "POST /setup/sessions/:sessionId/end",
  START: "POST /setup/sessions",
  STATE: "GET /setup/sessions/:sessionId"
});

function createError(code, message) {
  return { code, message, severity: "error" };
}

function failure(diagnostics) {
  return {
    diagnostics,
    ok: false
  };
}

function publicSession(session, state) {
  return {
    createdAt: session.createdAt,
    currentStateId: state?.currentStateId || session.currentStateId,
    endedAt: session.endedAt,
    expiresAt: session.expiresAt,
    id: session.id,
    revision: state?.revision ?? 0,
    siteId: session.context.siteId,
    updatedAt: session.updatedAt
  };
}

function validateSessionId(sessionId) {
  return typeof sessionId === "string" && sessionId.trim() !== "";
}

export default function createSetupApi(options = {}) {
  const setupService = options.setupService;

  if (!setupService || typeof setupService.start !== "function") {
    throw new TypeError("Setup API requires a Setup Service.");
  }

  function sessionFailure(sessionId) {
    if (validateSessionId(sessionId)) {
      return null;
    }

    return failure({
      errors: [createError("setup.api.session_id.required", "Setup session id is required.")],
      warnings: []
    });
  }

  return {
    version: SETUP_API_VERSION,

    advance(request = {}) {
      const invalidSession = sessionFailure(request.sessionId);
      if (invalidSession) {
        return invalidSession;
      }

      const result = setupService.advance(request.sessionId.trim());
      if (!result.ok) {
        return failure(result.diagnostics);
      }

      return {
        diagnostics: result.diagnostics,
        events: result.events,
        ok: true,
        session: publicSession(result.session, result.state)
      };
    },

    end(request = {}) {
      const invalidSession = sessionFailure(request.sessionId);
      if (invalidSession) {
        return invalidSession;
      }

      const result = setupService.endSession(request.sessionId.trim());
      if (!result.ok) {
        return failure(result.diagnostics);
      }

      return {
        diagnostics: result.diagnostics,
        events: result.events,
        ok: true,
        session: publicSession(result.session, result.state)
      };
    },

    start(request = {}) {
      if (typeof request.siteId !== "string" || request.siteId.trim() === "") {
        return failure({
          errors: [createError("setup.api.site_id.required", "Site id is required.")],
          warnings: []
        });
      }

      // The browser gateway always identifies itself; clients cannot select another setup client.
      const result = setupService.start({
        client: SetupClient.BROWSER,
        siteId: request.siteId
      });
      if (!result.ok) {
        return failure(result.diagnostics);
      }

      return {
        diagnostics: result.diagnostics,
        events: result.events,
        ok: true,
        session: publicSession(result.session, result.state)
      };
    },

    state(request = {}) {
      const invalidSession = sessionFailure(request.sessionId);
      if (invalidSession) {
        return invalidSession;
      }

      const result = setupService.getSession(request.sessionId.trim());
      if (!result.ok) {
        return failure(result.diagnostics);
      }

      return {
        diagnostics: result.diagnostics,
        ok: true,
        session: publicSession(result.session, result.state)
      };
    }
  };
}
