import { randomUUID } from "node:crypto";
import { appendFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import deepFreeze from "../shared/deepFreeze.js";

export const OPERATION_LOG_SCHEMA = "wpsc.operation-log";
export const OPERATION_LOG_VERSION = 1;
export const AUDIT_EVENT_SCHEMA = "wpsc.audit-event";
export const AUDIT_EVENT_VERSION = 1;

export default function createOperationalObservabilityService(options = {}) {
  const repository = options.repository;
  if (!repository?.resolveSiteRoot) throw new TypeError("Operational Observability requires a Site Repository.");
  const now = typeof options.now === "function" ? options.now : () => new Date().toISOString();
  const write = options.write ?? persist;

  async function record(input = {}) {
    const entry = createLogRecord(input, now());
    await write(logPath(repository, entry.siteId), entry);
    return deepFreeze(entry);
  }

  async function audit(input = {}) {
    const event = createAuditEvent(input, now());
    await write(auditPath(repository, event.siteId), event);
    return deepFreeze(event);
  }

  async function listLogs(siteId) { return readEntries(logPath(repository, requireSiteId(siteId))); }
  async function listAuditEvents(siteId) { return readEntries(auditPath(repository, requireSiteId(siteId))); }

  return Object.freeze({ audit, listAuditEvents, listLogs, record });
}

function createLogRecord(input, timestamp) {
  const level = String(input.level ?? "info").toLowerCase();
  if (!["debug", "info", "warn", "error"].includes(level)) throw new TypeError("Operation log level is invalid.");
  return redact({
    correlationId: input.correlationId ?? input.requestId ?? randomUUID(),
    context: input.context ?? null,
    errorCode: input.errorCode ?? null,
    eventId: input.eventId ?? null,
    jobId: input.jobId ?? null,
    level,
    message: String(input.message ?? ""),
    operation: requiredText(input.operation, "operation"),
    requestId: input.requestId ?? null,
    result: input.result ?? null,
    schema: OPERATION_LOG_SCHEMA,
    schemaVersion: OPERATION_LOG_VERSION,
    service: requiredText(input.service, "service"),
    siteId: requireSiteId(input.siteId),
    timestamp
  });
}

function createAuditEvent(input, timestamp) {
  return redact({
    actor: input.actor ? { id: String(input.actor.id ?? "unknown"), type: String(input.actor.type ?? "operator") } : { id: "system", type: "system" },
    correlationId: input.correlationId ?? input.requestId ?? randomUUID(),
    eventId: input.eventId ?? randomUUID(),
    operation: requiredText(input.operation, "operation"),
    outcome: input.outcome === "failed" ? "failed" : "succeeded",
    schema: AUDIT_EVENT_SCHEMA,
    schemaVersion: AUDIT_EVENT_VERSION,
    service: requiredText(input.service, "service"),
    siteId: requireSiteId(input.siteId),
    target: input.target ?? null,
    timestamp
  });
}

function logPath(repository, siteId) { return path.join(repository.resolveSiteRoot(siteId), "storage", "logs", "operations.ndjson"); }
function auditPath(repository, siteId) { return path.join(repository.resolveSiteRoot(siteId), "storage", "logs", "audit.ndjson"); }
async function persist(filePath, entry) { await mkdir(path.dirname(filePath), { recursive: true }); await appendFile(filePath, `${JSON.stringify(entry)}\n`, "utf8"); }
async function readEntries(filePath) { try { return deepFreeze((await readFile(filePath, "utf8")).split("\n").filter(Boolean).map((line) => JSON.parse(line))); } catch (error) { if (error.code === "ENOENT") return deepFreeze([]); throw error; } }
function requireSiteId(siteId) { const value = String(siteId ?? "").trim(); if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(value)) throw new TypeError("A valid Site id is required for operational observability."); return value; }
function requiredText(value, name) { const text = String(value ?? "").trim(); if (!text) throw new TypeError(`Operational ${name} is required.`); return text; }
function redact(value, key = "") { if (/(password|secret|token|credential|authorization|api.?key|consumer)/i.test(key)) return "[REDACTED]"; if (Array.isArray(value)) return value.map((entry) => redact(entry)); if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([entryKey, entryValue]) => [entryKey, redact(entryValue, entryKey)])); return value; }
