import { readFile } from "node:fs/promises";
import path from "node:path";
import createProductRolloutFacade from "../product/createProductRolloutFacade.js";
import { validateReleaseOperationsConfiguration } from "../product/createReleaseOperationsConfiguration.js";

export default function createProductRolloutCommand(options = {}) {
  async function run(input = {}) {
    try {
      if (!input.configPath) return invalid("release_operations.config.required", "CLI option --config is required.");
      const configuration = validateReleaseOperationsConfiguration(JSON.parse(await (options.readFile ?? readFile)(path.resolve(input.configPath), "utf8")), { retiredHarness: options.retiredHarness });
      const facade = createProductRolloutFacade({ configuration, registry: options.registry, releaseUpdate: options.releaseUpdate });
      const result = await facade.rollout(input);
      return { code: result.ok ? 0 : 1, result: redact(result) };
    } catch (error) { return { code: 1, result: { code: error.code ?? "release_operations.rollout.failed", diagnostics: { errors: [{ code: error.code ?? "release_operations.rollout.failed", message: "Rollout failed. Inspect redacted diagnostics.", severity: "error" }], warnings: [] }, ok: false } }; }
  }
  return Object.freeze({ run });
}

function redact(value) { if (Array.isArray(value)) return value.map(redact); if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).filter(([key]) => !/credential|password|token|secret|private.?key|protected/i.test(key)).map(([key, item]) => [key, redact(item)])); return value; }
function invalid(code, message) { return { code: 1, result: { code, diagnostics: { errors: [{ code, message, severity: "error" }], warnings: [] }, ok: false } }; }
