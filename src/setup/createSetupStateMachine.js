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
