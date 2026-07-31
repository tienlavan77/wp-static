import createInstallationSession from "./createInstallationSession.js";

export const WIZARD_API_VERSION = "1.0";

function createResponse(ok, payload = {}) {
  return {
    ok,
    ...payload
  };
}

function createErrorResponse(error) {
  return createResponse(false, {
    error: {
      code: "wizard.action.failed",
      message: error.message
    }
  });
}

function assertSessionId(sessionId) {
  if (typeof sessionId !== "string" || sessionId.trim() === "") {
    throw new TypeError("Wizard API sessionId must be a non-empty string.");
  }
}

export default function createWizardApi(options = {}) {
  const sessions = new Map();
  const createSession = options.createSession || createInstallationSession;

  function getSession(sessionId) {
    assertSessionId(sessionId);

    const session = sessions.get(sessionId);
    if (!session) {
      throw new Error(`Installation session "${sessionId}" was not found.`);
    }

    return session;
  }

  const api = {
    version: WIZARD_API_VERSION,

    create(input = {}, sessionOptions = {}) {
      const session = createSession({
        ...sessionOptions,
        input
      });

      sessions.set(session.id, session);

      return createResponse(true, {
        state: session.getState()
      });
    },

    state(sessionId) {
      try {
        return createResponse(true, {
          state: getSession(sessionId).getState()
        });
      } catch (error) {
        return createErrorResponse(error);
      }
    },

    update(sessionId, input = {}) {
      try {
        return createResponse(true, {
          state: getSession(sessionId).updateInput(input)
        });
      } catch (error) {
        return createErrorResponse(error);
      }
    },

    transition(sessionId, step, detail = {}) {
      try {
        return createResponse(true, {
          state: getSession(sessionId).transition(step, detail)
        });
      } catch (error) {
        return createErrorResponse(error);
      }
    },

    warning(sessionId, code, message, detail) {
      try {
        return createResponse(true, {
          state: getSession(sessionId).addWarning(code, message, detail)
        });
      } catch (error) {
        return createErrorResponse(error);
      }
    },

    fail(sessionId, code, message, detail) {
      try {
        return createResponse(true, {
          state: getSession(sessionId).fail(code, message, detail)
        });
      } catch (error) {
        return createErrorResponse(error);
      }
    },

    finish(sessionId, result = {}) {
      try {
        return createResponse(true, {
          state: getSession(sessionId).finish(result)
        });
      } catch (error) {
        return createErrorResponse(error);
      }
    },

    list() {
      return createResponse(true, {
        sessions: [...sessions.values()].map((session) => session.getState())
      });
    }
  };

  return api;
}
