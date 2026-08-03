import deepFreeze from "../../shared/deepFreeze.js";

export default function createCoreUpdateMigrationService(options = {}) {
  const staging = options.staging;
  const migrations = options.migrations;
  const configuration = options.configuration;
  if (!staging?.inspect || !migrations?.run || !configuration?.validate) throw new TypeError("Core Update Migration requires staging, Product Migration and configuration validation services.");
  async function validate(input = {}) {
    const staged = await staging.inspect(input.version);
    if (!staged.ok) return fail("core_update.migration.staging.invalid", "Staged Core release is not valid.", { staged });
    const migrated = await migrations.run({ fromVersion: input.fromVersion, toVersion: input.version });
    if (!migrated.ok) return fail("core_update.migration.failed", "Product migration failed.", { migrated });
    const validated = await configuration.validate(input.validation ?? {});
    if (!validated.ok) return fail("core_update.configuration.invalid", "Product configuration validation failed.", { migrated, validated });
    return ok({ migrated, staged, validated });
  }
  return Object.freeze({ validate });
}
function ok(data) { return deepFreeze({ diagnostics: { errors: [], warnings: [] }, ok: true, ...data }); }
function fail(code, message, data) { return deepFreeze({ diagnostics: { errors: [{ code, message, severity: "error" }], warnings: [] }, ok: false, ...data }); }
