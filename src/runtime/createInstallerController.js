import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { SiteState } from "../site/createSiteMetadata.js";

export const INSTALLER_CONTROLLER_VERSION = "1.0";

function diagnostic(code, message) { return { code, message, severity: "error" }; }

export default function createInstallerController(options = {}) {
  const repository = options.repository;
  const setupService = options.setupService;
  const stateManager = options.stateManager;
  if (!repository || typeof repository.readMetadata !== "function" || !setupService || typeof setupService.start !== "function" || !stateManager) throw new TypeError("Installer Controller requires Repository, Setup Service, and Site State Manager.");

  function begin(siteId) {
    return setupService.start({ client: "browser", siteId });
  }

  async function complete(input = {}) {
    const session = setupService.getSession(input.sessionId);
    if (!session.ok) return session;
    if (!input.configuration || typeof input.configuration !== "object" || Array.isArray(input.configuration)) {
      return { diagnostics: { errors: [diagnostic("runtime.installer.configuration.invalid", "Installer configuration must be an object.")], warnings: [] }, ok: false };
    }
    try {
      const siteId = session.session.context.siteId;
      const metadata = await repository.readMetadata(siteId);
      const transition = stateManager.transition(metadata, SiteState.READY_FOR_FIRST_BUILD, { reason: "installer.completed" });
      if (!transition.ok) return { diagnostics: { errors: [transition.error], warnings: [] }, ok: false };
      const configPath = path.join(repository.resolveSiteRoot(siteId), "config", "runtime.json");
      await mkdir(path.dirname(configPath), { recursive: true });
      await writeFile(configPath, `${JSON.stringify(input.configuration, null, 2)}\n`, "utf8");
      await repository.writeMetadata(siteId, transition.metadata);
      return { configurationPath: configPath, diagnostics: { errors: [], warnings: [] }, metadata: transition.metadata, ok: true };
    } catch (error) {
      return { diagnostics: { errors: [diagnostic("runtime.installer.persistence.failed", error.message)], warnings: [] }, ok: false };
    }
  }
  return Object.freeze({ begin, complete, version: INSTALLER_CONTROLLER_VERSION });
}
