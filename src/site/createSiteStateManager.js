import { SITE_STATUSES } from "./createSiteMetadata.js";

export const SITE_STATE_TRANSITIONS = {
  BUILDING: ["RUNNING", "READY", "ERROR", "DISABLED"],
  CREATED: ["SETUP_REQUIRED", "DISABLED"],
  DISABLED: ["SETUP_REQUIRED"],
  ERROR: ["SETUP_REQUIRED", "READY", "DISABLED"],
  READY: ["BUILDING", "RUNNING", "ERROR", "DISABLED"],
  REGISTERING_SOURCE: ["READY", "ERROR", "DISABLED"],
  RUNNING: ["BUILDING", "ERROR", "DISABLED"],
  SETUP_REQUIRED: ["REGISTERING_SOURCE", "ERROR", "DISABLED"]
};

function assertKnownStatus(status) {
  if (!SITE_STATUSES.includes(status)) {
    throw new Error(`Unknown site status: ${status}`);
  }
}

export default function createSiteStateManager(options = {}) {
  const transitions = options.transitions || SITE_STATE_TRANSITIONS;

  function canTransition(from, to) {
    assertKnownStatus(from);
    assertKnownStatus(to);
    return transitions[from]?.includes(to) || false;
  }

  function transition(metadata, to, transitionOptions = {}) {
    const from = metadata?.status;
    assertKnownStatus(from);
    assertKnownStatus(to);

    if (!canTransition(from, to)) {
      return {
        error: {
          code: "site.state.transition.invalid",
          from,
          message: `Cannot transition site from ${from} to ${to}.`,
          to
        },
        metadata,
        ok: false
      };
    }

    const now = transitionOptions.now || new Date().toISOString();
    const nextMetadata = {
      ...metadata,
      previous_status: from,
      status: to,
      status_reason: transitionOptions.reason || null,
      updated_at: now
    };

    return {
      metadata: nextMetadata,
      ok: true
    };
  }

  return {
    canTransition,
    transition,
    transitions
  };
}
