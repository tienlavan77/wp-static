import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, open, readFile, rename, rm } from "node:fs/promises";
import path from "node:path";

const execFile = promisify(execFileCallback);

export default function createSystemdRuntimeInstaller(options = {}) {
  const unitDirectory = path.resolve(options.unitDirectory ?? "/etc/systemd/system");
  const systemctl = options.systemd ?? createSystemctlAdapter(options.systemctlPath);
  const probe = options.probe ?? defaultProbe;
  const portOwner = options.portOwner ?? createPortOwner(options.ssPath);
  const now = options.now ?? (() => new Date().toISOString());

  async function render(input = {}) {
    const installationId = safeId(input.installationId);
    const workspace = safeAbsolute(input.workspace, "workspace");
    const node = path.join(workspace, "runtime", "node", "bin", "node");
    const cli = path.join(workspace, "core", "active", "framework", "src", "cli", "index.js");
    const runtimeUser = safeAccount(input.runtimeUser ?? "www-data");
    const runtimeGroup = safeAccount(input.runtimeGroup ?? runtimeUser);
    const port = validPort(input.port ?? 8787);
    const unitName = `wpsc-runtime-${installationId}.service`;
    const content = `[Unit]\nDescription=WPSC Runtime (${installationId})\nAfter=network.target\n\n[Service]\nType=simple\nUser=${runtimeUser}\nGroup=${runtimeGroup}\nWorkingDirectory=${unitPath(workspace)}\nEnvironmentFile=${unitPath(`${workspace}/config/runtime.env`)}\nExecStart=${[node, cli, "runtime:serve", "--config", `${workspace}/runtime.config.js`, "--project", workspace, "--host", "127.0.0.1", "--port", String(port)].map(unitQuote).join(" ")}\nRestart=always\nRestartSec=3\n\n[Install]\nWantedBy=multi-user.target\n`;
    return Object.freeze({ cli, content, installationId, node, port, runtimeGroup, runtimeUser, unitName, unitPath: path.join(unitDirectory, unitName), workspace });
  }

  async function install(input = {}) {
    const unit = await render(input);
    const existing = await readOptional(unit.unitPath);
    const backupPath = existing ? await backup(unit, existing) : null;
    try {
      await atomicWrite(unit.unitPath, unit.content, 0o644);
      await systemctl.daemonReload();
      await systemctl.enable(unit.unitName);
      await systemctl.restart(unit.unitName);
      const readiness = await waitForReadiness(unit, input.readinessAttempts ?? 5);
      if (!readiness.ok) throw new Error(readiness.message ?? "Runtime readiness probe failed.");
      return Object.freeze({ backupPath, installed: true, ok: true, readiness, unit });
    } catch (error) {
      if (existing) await atomicWrite(unit.unitPath, existing, 0o644); else await rm(unit.unitPath, { force: true });
      if (!existing && typeof systemctl.disable === "function") await systemctl.disable(unit.unitName).catch(() => {});
      await systemctl.daemonReload().catch(() => {});
      if (existing) await systemctl.restart(unit.unitName).catch(() => {});
      return failure("installation.systemd.activation_failed", error.message, { backupPath, unit });
    }
  }

  async function backup(unit, content) {
    const safeTime = now().replaceAll(":", "-");
    const target = path.join(unit.workspace, "storage", "installer", "backups", "systemd", `${unit.unitName}.${safeTime}.bak`);
    await atomicWrite(target, content, 0o600);
    return target;
  }
  async function waitForReadiness(unit, attempts) {
    let consecutiveHealthy = 0;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      const active = await systemctl.isActive(unit.unitName);
      const health = active ? await probe({ installationId: unit.installationId, port: unit.port, unit }) : { ok: false };
      const ownsPort = await runtimeOwnsPort(systemctl, portOwner, unit);
      consecutiveHealthy = active && health?.ok && ownsPort ? consecutiveHealthy + 1 : 0;
      // A spawned service may briefly look active while it is about to exit.
      if (consecutiveHealthy >= 2) return Object.freeze({ attempts: attempt, ok: true, status: health.status ?? 200 });
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, options.readinessDelayMs ?? 250));
    }
    return Object.freeze({ message: "Runtime did not become active and healthy.", ok: false });
  }
  return Object.freeze({ install, render });
}

function createSystemctlAdapter(systemctlPath = "/usr/bin/systemctl") {
  const run = (...args) => execFile(systemctlPath, args);
  return Object.freeze({ daemonReload: () => run("daemon-reload"), disable: (unit) => run("disable", unit), enable: (unit) => run("enable", unit), isActive: async (unit) => { try { await run("is-active", "--quiet", unit); return true; } catch { return false; } }, mainPid: async (unit) => { const value = (await run("show", unit, "--property=MainPID", "--value")).stdout.trim(); const pid = Number(value); return Number.isSafeInteger(pid) && pid > 0 ? pid : null; }, restart: (unit) => run("restart", unit) });
}
function createPortOwner(ssPath = "ss") { return async (port) => { try { const output = (await execFile(ssPath, ["-ltnp", `sport = :${port}`], { encoding: "utf8" })).stdout; const match = String(output).match(/pid=(\d+)/); return match ? Number(match[1]) : null; } catch { return null; } }; }
async function runtimeOwnsPort(systemctl, portOwner, unit) { if (typeof systemctl.mainPid !== "function" || typeof portOwner !== "function") return true; const [mainPid, ownerPid] = await Promise.all([systemctl.mainPid(unit.unitName), portOwner(unit.port)]); return mainPid !== null && mainPid === ownerPid; }
async function defaultProbe({ port }) { try { const response = await fetch(`http://127.0.0.1:${port}/health`); return { ok: response.ok, status: response.status }; } catch { return { ok: false }; } }
async function atomicWrite(target, content, mode) { await mkdir(path.dirname(target), { recursive: true }); const temporary = `${target}.${process.pid}.tmp`; await rm(temporary, { force: true }); const handle = await open(temporary, "wx", mode); try { await handle.writeFile(content, "utf8"); await handle.sync(); } finally { await handle.close(); } await rename(temporary, target); const directory = await open(path.dirname(target), "r"); try { await directory.sync(); } finally { await directory.close(); } }
async function readOptional(file) { try { return await readFile(file, "utf8"); } catch (error) { if (error.code === "ENOENT") return null; throw error; } }
function safeId(value) { const id = String(value ?? ""); if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(id)) throw new TypeError("Installation id is invalid for systemd."); return id; }
function safeAbsolute(value, label) { const result = path.resolve(String(value ?? "")); if (!path.isAbsolute(String(value ?? "")) || /[\r\n]/.test(result)) throw new TypeError(`Systemd ${label} must be an absolute safe path.`); return result; }
function safeAccount(value) { const result = String(value ?? ""); if (!/^[a-z_][a-z0-9_-]*$/i.test(result)) throw new TypeError("Systemd account is invalid."); return result; }
function validPort(value) { const port = Number(value); if (!Number.isInteger(port) || port < 1 || port > 65535) throw new TypeError("Runtime port is invalid."); return port; }
// Path directives are not shell arguments: quotes become literal characters.
function unitPath(value) { return String(value).replaceAll("%", "%%").replaceAll("\\", "\\\\").replaceAll(" ", "\\x20").replaceAll("\t", "\\t"); }
function unitQuote(value) { return `"${String(value).replaceAll("%", "%%").replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`; }
function failure(code, message, data = {}) { return Object.freeze({ diagnostics: { errors: [{ code, message, severity: "error" }], warnings: [] }, ok: false, ...data }); }
