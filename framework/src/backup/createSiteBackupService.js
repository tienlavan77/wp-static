import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import deepFreeze from "../shared/deepFreeze.js";

export const SITE_BACKUP_SCHEMA = "wpsc.site-backup";
export const SITE_BACKUP_VERSION = 1;

export default function createSiteBackupService(options = {}) {
  const repository = options.repository;
  const registry = options.registry;
  if (!repository?.resolveSiteRoot || !repository?.readMetadata || !registry?.listSites) throw new TypeError("Site Backup Service requires a Site Repository and Site Registry.");
  const readers = options.readers ?? {};
  const now = typeof options.now === "function" ? options.now : () => new Date().toISOString();

  async function create(siteId, input = {}) {
    const site = await findSite(siteId);
    if (!site) return failure("backup.site.not_found", `Site was not found: ${siteId}.`);
    const createdAt = now();
    const backupId = String(input.backupId ?? randomUUID());
    const state = await collectState(siteId, site);
    const backup = {
      backupId,
      createdAt,
      integrity: { algorithm: "sha256", checksum: checksum(state) },
      retention: normalizeRetention(input.retention),
      schema: SITE_BACKUP_SCHEMA,
      schemaVersion: SITE_BACKUP_VERSION,
      scope: "wpsc-operational-state",
      siteId,
      state,
      version: input.version ?? "1.0"
    };
    await writeBackup(siteId, backup);
    return success({ backup: deepFreeze(backup), path: backupPath(siteId, backupId) });
  }

  async function list(siteId) {
    if (!await findSite(siteId)) return failure("backup.site.not_found", `Site was not found: ${siteId}.`);
    try {
      const files = (await readdir(backupDirectory(siteId))).filter((file) => file.endsWith(".json")).sort();
      const backups = await Promise.all(files.map(async (file) => summary(JSON.parse(await readFile(path.join(backupDirectory(siteId), file), "utf8")))));
      return success({ backups });
    } catch (error) {
      if (error.code === "ENOENT") return success({ backups: [] });
      return failure("backup.list.failed", error.message);
    }
  }

  async function verify(siteId, backupId) {
    try {
      const backup = JSON.parse(await readFile(backupPath(siteId, backupId), "utf8"));
      if (backup.siteId !== siteId) return failure("backup.site.mismatch", "Backup Site identity does not match the requested Site.");
      if (backup.schema !== SITE_BACKUP_SCHEMA || backup.schemaVersion !== SITE_BACKUP_VERSION) return failure("backup.schema.invalid", "Backup contract is not supported.");
      const valid = backup.integrity?.algorithm === "sha256" && backup.integrity.checksum === checksum(backup.state);
      return valid ? success({ backup: summary(backup), verified: true }) : failure("backup.integrity.invalid", "Backup integrity verification failed.");
    } catch (error) {
      return failure(error.code === "ENOENT" ? "backup.not_found" : "backup.read.failed", error.code === "ENOENT" ? "Backup was not found." : error.message);
    }
  }

  async function read(siteId, backupId) {
    const verification = await verify(siteId, backupId);
    if (!verification.ok) return verification;
    try {
      const backup = JSON.parse(await readFile(backupPath(siteId, backupId), "utf8"));
      return success({ backup: deepFreeze(backup) });
    } catch (error) {
      return failure("backup.read.failed", error.message);
    }
  }

  async function collectState(siteId, site) {
    const [metadata, settings, sourceMetadata, scheduler, queue, publishing, deployment, extensions, runtime] = await Promise.all([
      repository.readMetadata(siteId),
      optional(() => repository.readSettings(siteId)),
      optional(() => repository.readSourceMetadata(siteId)),
      readState(readers.scheduler, siteId), readState(readers.queue, siteId), readState(readers.publishing, siteId),
      readState(readers.deployment, siteId), readState(readers.extensions, siteId), readState(readers.runtime, siteId)
    ]);
    // Credentials are never read; the registry contains only a runtime configuration reference.
    return redact({ deployment, extensions, metadata, publishing, queue, runtime, scheduler, settings, site: siteRecord(site), sourceMetadata });
  }

  async function findSite(siteId) {
    return (await registry.listSites()).find((site) => (site.siteId ?? site.id) === siteId) ?? null;
  }

  function backupDirectory(siteId) { return path.join(repository.resolveSiteRoot(siteId), "storage", "backups"); }
  function backupPath(siteId, backupId) { return path.join(backupDirectory(siteId), `${safeBackupId(backupId)}.json`); }

  async function writeBackup(siteId, backup) {
    const directory = backupDirectory(siteId);
    const target = backupPath(siteId, backup.backupId);
    await mkdir(directory, { recursive: true });
    const temporary = `${target}.tmp`;
    await writeFile(temporary, `${JSON.stringify(backup, null, 2)}\n`, "utf8");
    await rename(temporary, target);
  }

  return Object.freeze({ create, list, read, verify });
}

async function optional(read) { try { return await read(); } catch (error) { if (error.code === "ENOENT") return null; throw error; } }
async function readState(reader, siteId) { if (!reader) return null; return typeof reader === "function" ? reader(siteId) : reader.get?.(siteId) ?? reader.inspect?.(siteId) ?? null; }
function safeBackupId(value) { const id = String(value ?? ""); if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(id)) throw new TypeError("Backup id is invalid."); return id; }
function normalizeRetention(value = {}) { return { expiresAt: value.expiresAt ?? null, policy: value.policy ?? "manual" }; }
function siteRecord(site) { return { domains: [...(site.domains ?? [])], environment: site.environment ?? "production", runtimeConfigRef: site.runtimeConfigRef ?? null, siteId: site.siteId ?? site.id, status: site.status ?? "active", uuid: site.uuid ?? site.metadata?.uuid ?? null }; }
function checksum(value) { return createHash("sha256").update(stableJson(value)).digest("hex"); }
function stableJson(value) { if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`; if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(",")}}`; return JSON.stringify(value); }
function summary(backup) { return deepFreeze({ backupId: backup.backupId, createdAt: backup.createdAt, integrity: { ...backup.integrity }, retention: { ...backup.retention }, scope: backup.scope, siteId: backup.siteId, version: backup.version }); }
function redact(value, key = "") { if (/(password|secret|token|credential|authorization|api.?key|consumer)/i.test(key)) return "[REDACTED]"; if (Array.isArray(value)) return value.map((entry) => redact(entry)); if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([entryKey, entryValue]) => [entryKey, redact(entryValue, entryKey)])); return value; }
function success(data) { return deepFreeze({ diagnostics: { errors: [], warnings: [] }, ok: true, ...data }); }
function failure(code, message) { return deepFreeze({ diagnostics: { errors: [{ code, message, severity: "error" }], warnings: [] }, ok: false }); }
