export const INSTALLATION_SESSION_VERSION = "1.0";

export const INSTALLATION_STEPS = [
  "START",
  "CHECK",
  "CONFIGURE",
  "VALIDATE",
  "BUILD",
  "FINISH"
];

const TERMINAL_STATES = new Set(["FINISH", "FAILED"]);

function createDiagnostic(type, code, message, detail) {
  return {
    code,
    detail: detail || null,
    message,
    type
  };
}

function assertStep(step) {
  if (!INSTALLATION_STEPS.includes(step) && step !== "FAILED") {
    throw new TypeError(`Unknown installation step: ${step}`);
  }
}

function nextStep(currentStep) {
  const index = INSTALLATION_STEPS.indexOf(currentStep);

  if (index === -1 || index === INSTALLATION_STEPS.length - 1) {
    return null;
  }

  return INSTALLATION_STEPS[index + 1];
}

function cloneState(state) {
  return {
    diagnostics: {
      errors: [...state.diagnostics.errors],
      warnings: [...state.diagnostics.warnings]
    },
    id: state.id,
    input: { ...state.input },
    progress: {
      current: state.progress.current,
      history: state.progress.history.map((entry) => ({ ...entry })),
      percent: state.progress.percent,
      total: state.progress.total
    },
    result: state.result ? { ...state.result } : null,
    step: state.step,
    version: state.version
  };
}

function createProgress(step, history = []) {
  const currentIndex = INSTALLATION_STEPS.includes(step)
    ? INSTALLATION_STEPS.indexOf(step) + 1
    : history.length;
  const total = INSTALLATION_STEPS.length;

  return {
    current: Math.min(currentIndex, total),
    history,
    percent: Math.round((Math.min(currentIndex, total) / total) * 100),
    total
  };
}

export default function createInstallationSession(options = {}) {
  const state = {
    diagnostics: {
      errors: [],
      warnings: []
    },
    id: options.id || `install-${Date.now()}`,
    input: { ...(options.input || {}) },
    progress: createProgress("START"),
    result: null,
    step: "START",
    version: INSTALLATION_SESSION_VERSION
  };

  function recordStep(step, detail = {}) {
    state.progress.history.push({
      detail,
      step,
      timestamp: detail.timestamp || null
    });
    state.progress = createProgress(step, state.progress.history);
  }

  function assertActive() {
    if (TERMINAL_STATES.has(state.step)) {
      throw new Error(`Installation session is already ${state.step}.`);
    }
  }

  const session = {
    id: state.id,
    version: INSTALLATION_SESSION_VERSION,

    getState() {
      return cloneState(state);
    },

    updateInput(input = {}) {
      assertActive();
      state.input = {
        ...state.input,
        ...input
      };
      return session.getState();
    },

    addWarning(code, message, detail) {
      state.diagnostics.warnings.push(createDiagnostic("warning", code, message, detail));
      return session.getState();
    },

    addError(code, message, detail) {
      state.diagnostics.errors.push(createDiagnostic("error", code, message, detail));
      return session.getState();
    },

    transition(step, detail = {}) {
      assertActive();
      assertStep(step);

      const expected = nextStep(state.step);
      if (step !== expected) {
        throw new Error(`Cannot transition installation session from ${state.step} to ${step}.`);
      }

      state.step = step;
      recordStep(step, detail);
      return session.getState();
    },

    fail(code, message, detail) {
      if (state.step === "FINISH") {
        throw new Error("Finished installation session cannot fail.");
      }

      state.step = "FAILED";
      state.diagnostics.errors.push(createDiagnostic("error", code, message, detail));
      recordStep("FAILED", detail);
      return session.getState();
    },

    finish(result = {}) {
      assertActive();

      if (state.step !== "BUILD") {
        throw new Error("Installation session can only finish after BUILD.");
      }

      state.result = { ...result };
      state.step = "FINISH";
      recordStep("FINISH", result);
      return session.getState();
    }
  };

  recordStep("START", {
    reason: "session-created"
  });

  return session;
}
