import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";

const execFileDefault = promisify(execFileCallback);
const realProbe = Symbol.for("wpsc.real-vps-acceptance-probe");

export default function createRealVpsAcceptanceProbes(options = {}) {
  const workspace = path.resolve(options.workspace);
  const installationId = String(options.installationId ?? "");
  const domain = String(options.domain ?? "");
  const runtimeUser = options.runtimeUser ?? "www-data";
  const runtimeGroup = options.runtimeGroup ?? "www-data";
  const unit = options.unit ?? `wpsc-runtime-${installationId}.service`;
  const commandPath = options.commandPath ?? "/usr/local/bin/wpsc";
  const nginxPath = options.nginxPath ?? "nginx";
  const runtimeUrl = new URL(options.runtimeUrl);
  const domainUrl = new URL(options.domainUrl ?? `https://${domain}/`);
  const execFile = options.execFile ?? execFileDefault;
  const fetchImpl = options.fetch ?? globalThis.fetch;
  if (!installationId || !domain || typeof fetchImpl !== "function") throw new TypeError("Real VPS probes require Installation ID, domain and fetch support.");

  return Object.freeze({
    "global-command": mark(async () => {
      const result = await command(execFile, commandPath, ["--installation", installationId, "--version"]);
      return { command: commandPath, installationId, ok: true, version: result.stdout.trim() };
    }),
    systemd: mark(async () => {
      const result = await command(execFile, "systemctl", ["show", unit, "--property=ActiveState,User,Group,Environment,ExecStart", "--no-pager"]);
      const properties = parseProperties(result.stdout);
      const nodePath = path.join(workspace, "runtime", "node", "bin", "node");
      const cliPath = path.join(workspace, "core", "active", "framework", "src", "cli", "index.js");
      const identity = `WPSC_INSTALLATION_ID=${installationId}`;
      const ok = properties.ActiveState === "active" && properties.User === runtimeUser && properties.Group === runtimeGroup && properties.Environment?.split(" ").includes(identity) && properties.ExecStart?.includes(nodePath) && properties.ExecStart?.includes(cliPath);
      return { active: properties.ActiveState === "active", coreCli: cliPath, environment: properties.Environment?.includes(identity) ? identity : "[MISSING]", group: properties.Group, node: nodePath, ok, unit, user: properties.User };
    }),
    runtime: mark(async () => {
      const response = await fetchImpl(runtimeUrl, { headers: options.runtimeHost ? { host: options.runtimeHost } : undefined, redirect: "manual" });
      return { ok: response.status >= 200 && response.status < 500, status: response.status, url: runtimeUrl.href };
    }),
    nginx: mark(async () => {
      await command(execFile, nginxPath, ["-t"]);
      const response = await fetchImpl(domainUrl, { redirect: "manual" });
      return { domain, ok: response.status >= 200 && response.status < 500, status: response.status, url: domainUrl.href, validated: true };
    })
  });
}

export function isRealVpsAcceptanceProbe(value) { return typeof value === "function" && value[realProbe] === true; }
function mark(probe) { Object.defineProperty(probe, realProbe, { value: true }); return probe; }
async function command(execFile, executable, args) { try { return await execFile(executable, args, { encoding: "utf8" }); } catch (error) { const failure = new Error(`${executable} acceptance probe failed.`); failure.code = "installation.acceptance.command_failed"; throw failure; } }
function parseProperties(value) { return Object.fromEntries(String(value).split(/\r?\n/).filter(Boolean).map((line) => { const index = line.indexOf("="); return [line.slice(0, index), line.slice(index + 1)]; })); }
