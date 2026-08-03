import deepFreeze from "../../shared/deepFreeze.js";

export const CORE_UPDATE_SCHEMA = "wpsc.core-update";
export const CORE_UPDATE_VERSION = 1;

export const CoreUpdateState = Object.freeze({
  ACTIVATING: "ACTIVATING",
  BACKING_UP: "BACKING_UP",
  CHECKING: "CHECKING",
  COMPLETED: "COMPLETED",
  DOWNLOADING: "DOWNLOADING",
  FAILED: "FAILED",
  HEALTH_CHECK: "HEALTH_CHECK",
  IDLE: "IDLE",
  MIGRATING: "MIGRATING",
  PLANNED: "PLANNED",
  ROLLBACK: "ROLLBACK",
  ROLLED_BACK: "ROLLED_BACK",
  STAGING: "STAGING",
  VALIDATING: "VALIDATING",
  VERIFIED: "VERIFIED"
});

const forward = [
  [CoreUpdateState.IDLE, CoreUpdateState.CHECKING],
  [CoreUpdateState.CHECKING, CoreUpdateState.PLANNED],
  [CoreUpdateState.PLANNED, CoreUpdateState.DOWNLOADING],
  [CoreUpdateState.DOWNLOADING, CoreUpdateState.VERIFIED],
  [CoreUpdateState.VERIFIED, CoreUpdateState.BACKING_UP],
  [CoreUpdateState.BACKING_UP, CoreUpdateState.STAGING],
  [CoreUpdateState.STAGING, CoreUpdateState.MIGRATING],
  [CoreUpdateState.MIGRATING, CoreUpdateState.VALIDATING],
  [CoreUpdateState.VALIDATING, CoreUpdateState.ACTIVATING],
  [CoreUpdateState.ACTIVATING, CoreUpdateState.HEALTH_CHECK],
  [CoreUpdateState.HEALTH_CHECK, CoreUpdateState.COMPLETED],
  [CoreUpdateState.FAILED, CoreUpdateState.ROLLBACK],
  [CoreUpdateState.ROLLBACK, CoreUpdateState.ROLLED_BACK]
];

export function canTransition(from, to) {
  return to === CoreUpdateState.FAILED
    ? from !== CoreUpdateState.COMPLETED && from !== CoreUpdateState.ROLLED_BACK
    : forward.some(([source, target]) => source === from && target === to);
}

export function createCoreUpdateState(input = {}) {
  const state = input.state || CoreUpdateState.IDLE;
  if (!Object.values(CoreUpdateState).includes(state)) throw new TypeError(`Unknown Core Update state: ${state}.`);
  return deepFreeze({
    checkpoints: Array.isArray(input.checkpoints) ? input.checkpoints : [],
    history: Array.isArray(input.history) ? input.history : [],
    lastError: input.lastError ?? null,
    plan: input.plan ?? null,
    revision: Number.isInteger(input.revision) && input.revision >= 0 ? input.revision : 0,
    schema: CORE_UPDATE_SCHEMA,
    schemaVersion: CORE_UPDATE_VERSION,
    state,
    updateId: input.updateId ?? null,
    updatedAt: input.updatedAt ?? null
  });
}
