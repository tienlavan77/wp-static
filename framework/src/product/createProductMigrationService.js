import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import deepFreeze from "../shared/deepFreeze.js";

export const PRODUCT_MIGRATION_SCHEMA = "wpsc.product-migration";
export const PRODUCT_MIGRATION_VERSION = 1;

export default function createProductMigrationService(options = {}) {
  const workspaceDir = path.resolve(options.workspaceDir ?? process.cwd());
  const migrations = normalizeMigrations(options.migrations ?? []);
  const now = typeof options.now === "function" ? options.now : () => new Date().toISOString();

  async function plan(input = {}) {
    const fromVersion = requiredVersion(input.fromVersion);
    const toVersion = requiredVersion(input.toVersion);
    const selected = findPath(fromVersion, toVersion, migrations);
    if (!selected) return failure("migration.plan.unavailable", `No ordered migration path exists from ${fromVersion} to ${toVersion}.`);
    return success({ plan: deepFreeze({ fromVersion, migrations: selected.map((migration) => ({ fromVersion: migration.fromVersion, id: migration.id, toVersion: migration.toVersion })), schema: PRODUCT_MIGRATION_SCHEMA, schemaVersion: PRODUCT_MIGRATION_VERSION, toVersion }) });
  }

  async function run(input = {}) {
    const planned = await plan(input);
    if (!planned.ok || input.dryRun === true) return planned;
    const state = await readState();
    const configuration = await readConfiguration();
    const checkpoints = [];
    let nextConfiguration = configuration;
    for (const migration of planned.plan.migrations) {
      if (state.completed.includes(migration.id)) { checkpoints.push({ id: migration.id, state: "skipped" }); continue; }
      const implementation = migrations.find((candidate) => candidate.id === migration.id);
      try {
        const result = await implementation.migrate(deepFreeze({ configuration: nextConfiguration, workspaceDir }));
        nextConfiguration = result?.configuration ?? nextConfiguration;
        state.completed.push(migration.id);
        state.currentVersion = migration.toVersion;
        state.failed = null;
        checkpoints.push({ id: migration.id, state: "completed" });
        await writeConfiguration(nextConfiguration);
        await writeState(state);
      } catch (error) {
        state.failed = { id: migration.id, message: error.message, timestamp: now() };
        checkpoints.push({ id: migration.id, state: "failed" });
        await writeState(state);
        return failure("migration.execution.failed", error.message, { checkpoints, state: deepFreeze(state) });
      }
    }
    return success({ checkpoints, state: deepFreeze(state) });
  }

  async function status() { return success({ state: deepFreeze(await readState()) }); }
  function configPath() { return path.join(workspaceDir, "config", "wpsc.json"); }
  function statePath() { return path.join(workspaceDir, "storage", "migrations", "product.json"); }
  async function readConfiguration() { try { return JSON.parse(await readFile(configPath(), "utf8")); } catch (error) { if (error.code === "ENOENT") return {}; throw error; } }
  async function writeConfiguration(value) { await writeJson(configPath(), value); }
  async function readState() { try { return JSON.parse(await readFile(statePath(), "utf8")); } catch (error) { if (error.code === "ENOENT") return { completed: [], currentVersion: null, failed: null, schema: PRODUCT_MIGRATION_SCHEMA, schemaVersion: PRODUCT_MIGRATION_VERSION, updatedAt: null }; throw error; } }
  async function writeState(state) { await writeJson(statePath(), { ...state, updatedAt: now() }); }
  return Object.freeze({ plan, run, status });
}

function normalizeMigrations(migrations) { return migrations.map((migration) => { if (!migration?.id || !migration?.fromVersion || !migration?.toVersion || typeof migration.migrate !== "function") throw new TypeError("Product migration requires id, fromVersion, toVersion and migrate."); return { ...migration, fromVersion: requiredVersion(migration.fromVersion), toVersion: requiredVersion(migration.toVersion) }; }).sort((a, b) => a.fromVersion.localeCompare(b.fromVersion) || a.id.localeCompare(b.id)); }
function findPath(fromVersion, toVersion, migrations) { if (fromVersion === toVersion) return []; const output = []; let cursor = fromVersion; const seen = new Set(); while (cursor !== toVersion) { const migration = migrations.find((candidate) => candidate.fromVersion === cursor && compare(candidate.toVersion, toVersion) <= 0); if (!migration || seen.has(migration.id)) return null; output.push(migration); seen.add(migration.id); cursor = migration.toVersion; } return output; }
function compare(left, right) { const a = left.split(".").map(Number); const b = right.split(".").map(Number); for (let index = 0; index < 3; index += 1) if (a[index] !== b[index]) return a[index] - b[index]; return 0; }
function requiredVersion(value) { const version = String(value ?? ""); if (!/^\d+\.\d+\.\d+$/.test(version)) throw new TypeError("Migration versions must use x.y.z format."); return version; }
async function writeJson(target, value) { await mkdir(path.dirname(target), { recursive: true }); const temporary = `${target}.tmp`; await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8"); await rename(temporary, target); }
function success(data) { return deepFreeze({ diagnostics: { errors: [], warnings: [] }, ok: true, schema: PRODUCT_MIGRATION_SCHEMA, schemaVersion: PRODUCT_MIGRATION_VERSION, ...data }); }
function failure(code, message, data = {}) { return deepFreeze({ diagnostics: { errors: [{ code, message, severity: "error" }], warnings: [] }, ok: false, schema: PRODUCT_MIGRATION_SCHEMA, schemaVersion: PRODUCT_MIGRATION_VERSION, ...data }); }
