import assert from "node:assert/strict";
import test from "node:test";
import createSetupStateMachine, {
  canTransition,
  SetupState
} from "../src/setup/createSetupStateMachine.js";

test("setup state machine follows the Phase 3 workflow transitions", () => {
  const machine = createSetupStateMachine();

  assert.deepEqual(machine.getState(), {
    currentStateId: SetupState.NOT_STARTED,
    previousStateId: null,
    revision: 0
  });
  assert.equal(machine.canTransition(SetupState.VALIDATING), true);
  assert.deepEqual(machine.transition(SetupState.VALIDATING), {
    currentStateId: SetupState.VALIDATING,
    previousStateId: SetupState.NOT_STARTED,
    revision: 1
  });
  machine.transition(SetupState.CONFIGURING);
  machine.transition(SetupState.REGISTERING_SOURCE);
  assert.equal(machine.transition(SetupState.READY).currentStateId, SetupState.READY);
  assert.equal(machine.canTransition(SetupState.FAILED), false);
});

test("setup state machine rejects illegal transitions and unknown states", () => {
  const machine = createSetupStateMachine();

  assert.equal(canTransition(SetupState.NOT_STARTED, SetupState.FAILED), true);
  assert.throws(
    () => machine.transition(SetupState.READY),
    (error) => error.code === "setup.state.transition.invalid"
  );
  assert.throws(() => createSetupStateMachine({ initialState: "UNKNOWN" }), /Unknown setup state/);
});
