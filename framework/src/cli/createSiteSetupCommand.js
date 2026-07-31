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
    async run(input = {}) {
      const started = setupService.start({
        client: SetupClient.CLI,
        siteId: input.siteId
      });

      if (!started.ok) {
        return report(started);
      }

      let result = started;
      if (input.advance) {
        result = setupService.advance(started.session.id);
      }
      if (!result.ok || !input.source) {
        return report(result);
      }

      return report(await setupService.registerSource(result.session.id, {
        adapterOptions: input.adapterOptions,
        credentials: input.credentials,
        source: input.source,
        webhookUrl: input.webhookUrl
      }));
    },
    version: SITE_SETUP_COMMAND_VERSION
  };
}
