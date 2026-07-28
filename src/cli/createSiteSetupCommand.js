import { SetupClient } from "../setup/createSetupService.js";

export const SITE_SETUP_COMMAND_VERSION = "1.0";

function formatProgress(result) {
  const session = result.session;
  const presentation = result.presentation || {};
  const state = result.state || {};

  return `Setup ${session.context.siteId}: ${presentation.title || state.currentStateId} (${presentation.progress ?? 0}%, revision ${state.revision ?? 0})`;
}

function writeDiagnostics(write, diagnostics = {}) {
  for (const diagnostic of diagnostics.errors || []) {
    write(`[${diagnostic.severity}] ${diagnostic.code}: ${diagnostic.message}`);
  }
}

export default function createSiteSetupCommand(options = {}) {
  const setupService = options.setupService;
  const write = options.write || (() => {});

  if (!setupService || typeof setupService.start !== "function") {
    throw new TypeError("Site setup command requires a Setup Service.");
  }

  function report(result) {
    if (!result.ok) {
      writeDiagnostics(write, result.diagnostics);
      return result;
    }

    write(formatProgress(result));
    return result;
  }

  return {
    run(input = {}) {
      const started = setupService.start({
        client: SetupClient.CLI,
        siteId: input.siteId
      });

      if (!started.ok || !input.advance) {
        return report(started);
      }

      return report(setupService.advance(started.session.id));
    },
    version: SITE_SETUP_COMMAND_VERSION
  };
}
