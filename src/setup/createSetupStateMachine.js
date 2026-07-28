export const SetupState = Object.freeze({
  CONFIGURING: "CONFIGURING",
  FAILED: "FAILED",
  NOT_STARTED: "NOT_STARTED",
  READY: "READY",
  REGISTERING_SOURCE: "REGISTERING_SOURCE",
  VALIDATING: "VALIDATING"
});

const TRANSITIONS = Object.freeze({
  [SetupState.CONFIGURING]: Object.freeze([SetupState.REGISTERING_SOURCE, SetupState.FAILED]),
  [SetupState.FAILED]: Object.freeze([]),
  [SetupState.NOT_STARTED]: Object.freeze([SetupState.VALIDATING, SetupState.FAILED]),
  [SetupState.READY]: Object.freeze([]),
  [SetupState.REGISTERING_SOURCE]: Object.freeze([SetupState.READY, SetupState.FAILED]),
  [SetupState.VALIDATING]: Object.freeze([SetupState.CONFIGURING, SetupState.FAILED])
});

const PRIMARY_TRANSITIONS = Object.freeze({
  [SetupState.CONFIGURING]: SetupState.REGISTERING_SOURCE,
  [SetupState.FAILED]: null,
  [SetupState.NOT_STARTED]: SetupState.VALIDATING,
  [SetupState.READY]: null,
  [SetupState.REGISTERING_SOURCE]: SetupState.READY,
  [SetupState.VALIDATING]: SetupState.CONFIGURING
});

const PRESENTATIONS = Object.freeze({
  [SetupState.CONFIGURING]: Object.freeze({
    canAdvance: true,
    progress: 50,
    title: "Configuring site"
  }),
  [SetupState.FAILED]: Object.freeze({
    canAdvance: false,
    progress: 100,
    title: "Setup needs attention"
  }),
  [SetupState.NOT_STARTED]: Object.freeze({
    canAdvance: true,
    progress: 0,
    title: "Setup is ready to begin"
  }),
  [SetupState.READY]: Object.freeze({
    canAdvance: false,
    progress: 100,
    title: "Setup is ready for first build"
  }),
  [SetupState.REGISTERING_SOURCE]: Object.freeze({
    canAdvance: true,
    progress: 75,
    title: "Registering source"
  }),
  [SetupState.VALIDATING]: Object.freeze({
    canAdvance: true,
    progress: 25,
    title: "Validating environment"
  })
});

function assertState(state) {
  if (!Object.values(SetupState).includes(state)) {
    throw new TypeError(`Unknown setup state: ${state}`);
  }
}

export function canTransition(from, to) {
  assertState(from);
  assertState(to);
  return TRANSITIONS[from].includes(to);
}

export function createSetupStatePresentation(state) {
  assertState(state.currentStateId);
  const presentation = PRESENTATIONS[state.currentStateId];

  return Object.freeze({
    canAdvance: presentation.canAdvance,
    progress: presentation.progress,
    revision: state.revision,
    title: presentation.title
  });
}

export default function createSetupStateMachine(options = {}) {
  let current = options.initialState || SetupState.NOT_STARTED;
  let revision = 0;
  assertState(current);

  function snapshot(previousState = null) {
    return Object.freeze({
      currentStateId: current,
      previousStateId: previousState,
      revision
    });
  }

  return {
    canTransition(nextState) {
      return canTransition(current, nextState);
    },

    getState() {
      return snapshot();
    },

    getPresentation() {
      return createSetupStatePresentation(snapshot());
    },

    nextState() {
      return PRIMARY_TRANSITIONS[current];
    },

    transition(nextState) {
      assertState(nextState);

      if (!canTransition(current, nextState)) {
        const error = new Error(`Cannot transition setup from ${current} to ${nextState}.`);
        error.code = "setup.state.transition.invalid";
        throw error;
      }

      const previousState = current;
      current = nextState;
      revision += 1;
      return snapshot(previousState);
    }
  };
}
