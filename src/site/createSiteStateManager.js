import { SITE_STATUSES, SiteState } from "./createSiteMetadata.js";

export const SITE_STATE_TRANSITIONS = {
  [SiteState.BUILDING]: [SiteState.RUNNING, SiteState.READY, SiteState.ERROR, SiteState.DISABLED],
  [SiteState.CREATED]: [SiteState.SETUP_REQUIRED, SiteState.DISABLED],
  [SiteState.DISABLED]: [SiteState.SETUP_REQUIRED],
  [SiteState.ERROR]: [SiteState.SETUP_REQUIRED, SiteState.READY, SiteState.DISABLED],
  [SiteState.READY]: [SiteState.BUILDING, SiteState.RUNNING, SiteState.ERROR, SiteState.DISABLED],
  [SiteState.REGISTERING_SOURCE]: [SiteState.READY, SiteState.ERROR, SiteState.DISABLED],
  [SiteState.RUNNING]: [SiteState.BUILDING, SiteState.ERROR, SiteState.DISABLED],
  [SiteState.SETUP_REQUIRED]: [SiteState.REGISTERING_SOURCE, SiteState.ERROR, SiteState.DISABLED]
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
