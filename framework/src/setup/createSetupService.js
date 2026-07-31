import deepFreeze from "../shared/deepFreeze.js";
import createSetupSessionManager from "./createSetupSessionManager.js";
import createSetupStateMachine, {
  createSetupStatePresentation,
  SetupState
} from "./createSetupStateMachine.js";

export { SetupState };

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
  STARTED: "setup.started",
  STATE_CHANGED: "setup.state.changed"
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
  const sourceRegistrationService = options.sourceRegistrationService || null;
  const webhookActivationService = options.webhookActivationService || null;
  const firstBuildReadinessService = options.firstBuildReadinessService || null;
  const sessionManager = createSetupSessionManager({
    createId: options.createSessionId,
    now: options.now,
    validateContext: validateSetupContext
  });
  const stateMachines = new Map();
  const stateSnapshots = new Map();

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
      stateMachines.set(session.id, createSetupStateMachine());
      stateSnapshots.delete(session.id);
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
      presentation: stateMachines.get(session.id).getPresentation(),
      session,
      state: stateMachines.get(session.id).getState()
    };
  }

  function getSession(sessionId) {
    try {
      const session = sessionManager.get(sessionId);
      const state = stateMachines.get(session.id)?.getState() || stateSnapshots.get(session.id) || null;
      return {
        diagnostics: { errors: [], warnings: [] },
        ok: true,
        presentation: state ? createSetupStatePresentation(state) : null,
        session,
        state
      };
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
      const state = stateMachines.get(session.id)?.getState() || null;
      if (state) {
        stateSnapshots.set(session.id, state);
      }
      stateMachines.delete(session.id);
      emit(events, SetupEvent.SESSION_ENDED, {
        sessionId: session.id,
        siteId: session.context.siteId
      });
      return {
        diagnostics: { errors: [], warnings: [] },
        events,
        ok: true,
        presentation: state ? createSetupStatePresentation(state) : null,
        session,
        state
      };
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

  function transition(sessionId, nextState) {
    const sessionResult = getSession(sessionId);
    if (!sessionResult.ok) {
      return sessionResult;
    }

    const machine = stateMachines.get(sessionId);
    if (!machine) {
      return {
        diagnostics: {
          errors: [{
            code: "setup.state.machine.not_found",
            message: "Setup state machine was not found.",
            severity: "error"
          }],
          warnings: []
        },
        ok: false
      };
    }

    try {
      const state = machine.transition(nextState);
      const session = sessionManager.update(sessionId, {
        currentStateId: state.currentStateId
      });
      const events = [];
      emit(events, SetupEvent.STATE_CHANGED, {
        currentStateId: state.currentStateId,
        previousStateId: state.previousStateId,
        revision: state.revision,
        sessionId
      });
      return {
        diagnostics: { errors: [], warnings: [] },
        events,
        ok: true,
        presentation: createSetupStatePresentation(state),
        session,
        state
      };
    } catch (error) {
      return {
        diagnostics: {
          errors: [{
            code: error.code || "setup.state.transition.failed",
            message: error.message,
            severity: "error"
          }],
          warnings: []
        },
        events: [],
        ok: false
      };
    }
  }

  function advance(sessionId) {
    const sessionResult = getSession(sessionId);
    if (!sessionResult.ok) {
      return sessionResult;
    }

    const nextState = stateMachines.get(sessionId)?.nextState();
    if (!nextState) {
      return {
        diagnostics: {
          errors: [{
            code: "setup.state.advance.unavailable",
            message: "Setup workflow cannot advance from its current state.",
            severity: "error"
          }],
          warnings: []
        },
        events: [],
        ok: false
      };
    }

    return transition(sessionId, nextState);
  }

  async function registerSource(sessionId, input = {}) {
    let sessionResult = getSession(sessionId);
    if (!sessionResult.ok) {
      return sessionResult;
    }

    // Only Setup Service advances the workflow needed before source registration.
    while (sessionResult.state?.currentStateId !== SetupState.REGISTERING_SOURCE) {
      const advanced = advance(sessionId);
      if (!advanced.ok) {
        return advanced;
      }
      sessionResult = getSession(sessionId);
    }

    if (sessionResult.state?.currentStateId !== SetupState.REGISTERING_SOURCE) {
      return {
        diagnostics: {
          errors: [createDiagnostic(
            "setup.source.registration.unavailable",
            "A source can only be registered while setup is registering a source."
          )],
          warnings: []
        },
        events: [],
        ok: false
      };
    }

    if (!sourceRegistrationService || typeof sourceRegistrationService.register !== "function") {
      return {
        diagnostics: {
          errors: [createDiagnostic(
            "setup.source.registration.unavailable",
            "Source registration is not configured for this Setup Service."
          )],
          warnings: []
        },
        events: [],
        ok: false
      };
    }

    const registration = await sourceRegistrationService.register({
      ...input,
      siteId: sessionResult.session.context.siteId
    });
    if (!registration.ok) {
      return { ...registration, presentation: sessionResult.presentation, session: sessionResult.session, state: sessionResult.state };
    }

    if (typeof input.webhookUrl !== "string" || input.webhookUrl.trim() === "") {
      return { ...registration, presentation: sessionResult.presentation, session: sessionResult.session, state: sessionResult.state };
    }

    if (!webhookActivationService || typeof webhookActivationService.activate !== "function") {
      return {
        diagnostics: {
          errors: [createDiagnostic(
            "setup.webhook.activation.unavailable",
            "Webhook activation is not configured for this Setup Service."
          )],
          warnings: []
        },
        events: registration.events,
        ok: false,
        presentation: sessionResult.presentation,
        session: sessionResult.session,
        state: sessionResult.state
      };
    }

    const activation = await webhookActivationService.activate({
      adapterOptions: input.adapterOptions,
      siteId: sessionResult.session.context.siteId,
      webhookUrl: input.webhookUrl
    });
    return {
      ...activation,
      events: [...registration.events, ...(activation.events || [])],
      presentation: sessionResult.presentation,
      registration,
      session: sessionResult.session,
      state: sessionResult.state
    };
  }

  async function readyForFirstBuild(sessionId) {
    const sessionResult = getSession(sessionId);
    if (!sessionResult.ok) return sessionResult;
    if (sessionResult.state?.currentStateId !== SetupState.REGISTERING_SOURCE || !firstBuildReadinessService) {
      return { diagnostics: { errors: [createDiagnostic("setup.ready.unavailable", "First build readiness is not available for this setup session.")], warnings: [] }, events: [], ok: false };
    }
    const validation = await firstBuildReadinessService.validate(sessionResult.session.context.siteId);
    if (!validation.ok) return { ...validation, events: [], presentation: sessionResult.presentation, session: sessionResult.session, state: sessionResult.state };
    const transitioned = transition(sessionId, SetupState.READY_FOR_FIRST_BUILD);
    const events = [...transitioned.events];
    emit(events, "setup.readyForFirstBuild", { siteId: sessionResult.session.context.siteId });
    return { ...transitioned, events, metadata: validation.metadata };
  }

  return {
    advance,
    createContext,
    endSession,
    getSession,
    registerSource,
    readyForFirstBuild,
    start,
    version: SETUP_SERVICE_VERSION
  };
}
