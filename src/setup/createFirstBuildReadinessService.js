export const FirstBuildReadinessEvent = "setup.readyForFirstBuild";

function diagnostic(code, message) {
  return { code, message, severity: "error" };
}

export default function createFirstBuildReadinessService(options = {}) {
  const repository = options.repository;
  if (!repository || typeof repository.readSourceMetadata !== "function") {
    throw new TypeError("First build readiness requires a Site Repository.");
  }

  async function validate(siteId) {
    try {
      const metadata = await repository.readSourceMetadata(siteId);
      const valid = metadata?.schema === "source-metadata" && metadata?.schemaVersion === 1
        && typeof metadata.sourceType === "string" && typeof metadata.endpoint === "string"
        && typeof metadata.adapterVersion === "string" && Array.isArray(metadata.capabilities);
      if (!valid || (metadata.webhookStatus && metadata.webhookStatus !== "verified")) {
        return { diagnostics: { errors: [diagnostic("setup.ready.validation.failed", "Persisted source metadata is not ready for first build.")], warnings: [] }, ok: false };
      }
      return { diagnostics: { errors: [], warnings: [] }, metadata, ok: true };
    } catch (error) {
      return { diagnostics: { errors: [diagnostic("setup.ready.validation.failed", error.message)], warnings: [] }, ok: false };
    }
  }
  return { validate };
}
