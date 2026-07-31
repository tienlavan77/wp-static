import escapeHtml from "../../shared/escapeHtml.js";

export const DASHBOARD_CONTROLLER_VERSION = "1.0";

function diagnostic(code, message) { return { code, message, severity: "error" }; }

async function readSourceStatus(repository, siteId) {
  try {
    const metadata = await repository.readSourceMetadata(siteId);
    return { connected: true, endpoint: metadata.endpoint || "", sourceType: metadata.sourceType, webhookStatus: metadata.webhookStatus || null };
  } catch {
    return { connected: false, endpoint: "", sourceType: null, webhookStatus: null };
  }
}

export default function createDashboardController(options = {}) {
  const repository = options.repository;
  const credentialStore = options.credentialStore || null;
  const buildStatusProvider = options.buildStatusProvider || { get: async () => null };
  if (!repository || typeof repository.readMetadata !== "function" || typeof repository.readSourceMetadata !== "function") throw new TypeError("Dashboard Controller requires a Site Repository.");
  if (typeof buildStatusProvider.get !== "function") throw new TypeError("Dashboard build status provider must implement get().");

  async function show(siteId) {
    try {
      const [metadata, source, build, credentials] = await Promise.all([
        repository.readMetadata(siteId),
        readSourceStatus(repository, siteId),
        buildStatusProvider.get(siteId),
        credentialStore ? credentialStore.summary(siteId) : {}
      ]);
      return { build, credentials, diagnostics: { errors: [], warnings: [] }, metadata, ok: true, source };
    } catch (error) {
      return { diagnostics: { errors: [diagnostic("runtime.dashboard.load.failed", error.message)], warnings: [] }, ok: false };
    }
  }

  function render(snapshot) {
    if (!snapshot?.ok) return "<main><h1>Dashboard unavailable</h1></main>";
    const source = snapshot.source.connected ? snapshot.source.sourceType : "Not connected";
    const build = snapshot.build?.status || "No build recorded";
    return `<main data-wpsc-dashboard><h1>${escapeHtml(snapshot.metadata.name)}</h1><dl><dt>Runtime state</dt><dd>${escapeHtml(snapshot.metadata.status)}</dd><dt>Source</dt><dd>${escapeHtml(source)}</dd><dt>Build</dt><dd>${escapeHtml(build)}</dd></dl></main>`;
  }

  return Object.freeze({ render, show, version: DASHBOARD_CONTROLLER_VERSION });
}
