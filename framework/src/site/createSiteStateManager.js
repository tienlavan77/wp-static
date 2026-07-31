import { SITE_STATUSES, SiteState } from "./createSiteMetadata.js";

export const SITE_STATE_TRANSITIONS = {
  [SiteState.BUILDING]: [SiteState.RUNNING, SiteState.ERROR],
  [SiteState.CREATED]: [SiteState.SETUP_REQUIRED],
  [SiteState.ERROR]: [SiteState.SETUP_REQUIRED, SiteState.READY_FOR_FIRST_BUILD],
  [SiteState.MAINTENANCE]: [SiteState.RUNNING, SiteState.ERROR],
  [SiteState.READY_FOR_FIRST_BUILD]: [SiteState.BUILDING, SiteState.ERROR],
  [SiteState.RUNNING]: [SiteState.BUILDING, SiteState.MAINTENANCE, SiteState.ERROR],
  [SiteState.SETUP_REQUIRED]: [SiteState.READY_FOR_FIRST_BUILD, SiteState.ERROR]
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
