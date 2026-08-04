import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";
import { lstat, mkdir, open, readFile, readlink, rename, rm, symlink } from "node:fs/promises";
import path from "node:path";

const execFile = promisify(execFileCallback);

export default function createNginxInstaller(options = {}) {
  const availableDirectory = path.resolve(options.availableDirectory ?? "/etc/nginx/sites-available");
  const enabledDirectory = path.resolve(options.enabledDirectory ?? "/etc/nginx/sites-enabled");
  const nginx = options.nginx ?? createNginxAdapter(options.nginxPath, options.nginxConfigPath);
  const now = options.now ?? (() => new Date().toISOString());

  async function render(input = {}) {
    const installationId = safeId(input.installationId);
    const domain = safeDomain(input.domain);
    const workspace = safeAbsolute(input.workspace);
    const publicRoot = safeAbsolute(input.publicRoot ?? path.join(workspace, "public"));
    const runtimeOrigin = safeRuntimeOrigin(input.runtimeOrigin ?? "http://127.0.0.1:8787");
    const fileName = `wpsc-${installationId}-${domain}.conf`;
    const content = `# WPSC-MANAGED installation=${installationId} domain=${domain}\nserver {\n    listen 80;\n    listen [::]:80;\n    server_name ${domain} www.${domain};\n\n    root ${nginxQuote(publicRoot)};\n    index index.html;\n\n    location / {\n        try_files $uri $uri/ @wpsc_runtime;\n    }\n\n    location @wpsc_runtime {\n        proxy_http_version 1.1;\n        proxy_set_header Host $host;\n        proxy_set_header X-Real-IP $remote_addr;\n        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;\n        proxy_set_header X-Forwarded-Proto $scheme;\n        proxy_pass ${runtimeOrigin};\n    }\n\n    location ~ ^/(config|storage|core|runtime)/ { deny all; }\n    location ~ /\\. { deny all; }\n}\n`;
    return Object.freeze({ availablePath: path.join(availableDirectory, fileName), content, domain, enabledPath: path.join(enabledDirectory, fileName), fileName, installationId, publicRoot, runtimeOrigin, workspace });
  }

  async function install(input = {}) {
    const config = await render(input);
    const existingConfig = await readOptional(config.availablePath);
    const existingEnabled = await readEnabled(config.enabledPath);
    if (existingConfig && !existingConfig.startsWith("# WPSC-MANAGED ")) return failure("installation.nginx.operator_owned", "Existing Nginx configuration is operator-owned and cannot be replaced.", { config });
    if (existingEnabled && existingEnabled.type !== "symlink") return failure("installation.nginx.operator_owned", "Existing enabled Nginx configuration is operator-owned and cannot be replaced.", { config });
    const expectedLink = path.relative(enabledDirectory, config.availablePath);
    if (existingEnabled?.type === "symlink" && existingEnabled.target !== expectedLink) return failure("installation.nginx.operator_owned", "Existing enabled Nginx link points outside the WPSC-managed configuration.", { config });
    const backupPath = existingConfig ? await backup(config, existingConfig) : null;
    const candidate = `${config.availablePath}.${process.pid}.candidate`;
    try {
      await atomicWrite(candidate, config.content, 0o644);
      const validation = await nginx.validate(candidate);
      if (!validation?.ok) throw new Error(validation?.message ?? "Nginx configuration validation failed.");
      await rename(candidate, config.availablePath);
      await activateLink(config, expectedLink);
      await nginx.reload();
      return Object.freeze({ activated: true, backupPath, config, ok: true, validation });
    } catch (error) {
      await rm(candidate, { force: true });
      if (existingConfig) await atomicWrite(config.availablePath, existingConfig, 0o644); else await rm(config.availablePath, { force: true });
      await restoreEnabled(config.enabledPath, existingEnabled);
      if (existingConfig || existingEnabled) await nginx.reload().catch(() => {});
      return failure("installation.nginx.activation_failed", error.message, { backupPath, config });
    }
  }

  async function activateLink(config, target) {
    await mkdir(enabledDirectory, { recursive: true });
    const temporary = `${config.enabledPath}.${process.pid}.tmp`;
    await rm(temporary, { force: true });
    try { await symlink(target, temporary); await rename(temporary, config.enabledPath); }
    finally { await rm(temporary, { force: true }); }
  }
  async function backup(config, content) { const timestamp = now().replaceAll(":", "-"); const target = path.join(config.workspace, "storage", "installer", "backups", "nginx", `${config.fileName}.${timestamp}.bak`); await atomicWrite(target, content, 0o600); return target; }
  return Object.freeze({ install, render });
}

function createNginxAdapter(nginxPath = "/usr/sbin/nginx") {
  return Object.freeze({
    reload: () => execFile(nginxPath, ["-s", "reload"]),
    validate: async (candidate) => {
      const wrapper = `${candidate}.validation.conf`;
      try {
        await atomicWrite(wrapper, `events {}\nhttp { include ${nginxQuote(candidate)}; }\n`, 0o600);
        await execFile(nginxPath, ["-t", "-c", wrapper]);
        return { ok: true };
      } catch (error) { return { message: error.stderr || error.message, ok: false }; }
      finally { await rm(wrapper, { force: true }); }
    }
  });
}
async function restoreEnabled(target, previous) { await rm(target, { force: true, recursive: true }); if (!previous) return; if (previous.type === "symlink") await symlink(previous.target, target); }
async function readEnabled(target) { try { const metadata = await lstat(target); return metadata.isSymbolicLink() ? { target: await readlink(target), type: "symlink" } : { type: "other" }; } catch (error) { if (error.code === "ENOENT") return null; throw error; } }
async function atomicWrite(target, content, mode) { await mkdir(path.dirname(target), { recursive: true }); const temporary = `${target}.${process.pid}.tmp`; await rm(temporary, { force: true }); const handle = await open(temporary, "wx", mode); try { await handle.writeFile(content, "utf8"); await handle.sync(); } finally { await handle.close(); } await rename(temporary, target); const directory = await open(path.dirname(target), "r"); try { await directory.sync(); } finally { await directory.close(); } }
async function readOptional(target) { try { return await readFile(target, "utf8"); } catch (error) { if (error.code === "ENOENT") return null; throw error; } }
function safeId(value) { const id = String(value ?? ""); if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(id)) throw new TypeError("Installation id is invalid for Nginx."); return id; }
function safeDomain(value) { const domain = String(value ?? "").toLowerCase(); if (!/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(domain)) throw new TypeError("Nginx domain is invalid."); return domain; }
function safeAbsolute(value) { const original = String(value ?? ""); if (!path.isAbsolute(original) || /[\r\n]/.test(original)) throw new TypeError("Nginx path must be absolute and safe."); return path.resolve(original); }
function safeRuntimeOrigin(value) { const url = new URL(String(value)); if (url.protocol !== "http:" || !["127.0.0.1", "localhost"].includes(url.hostname) || url.username || url.password || url.pathname !== "/") throw new TypeError("Nginx Runtime origin must be a local HTTP origin."); return url.origin; }
function nginxQuote(value) { return `"${String(value).replaceAll("\\", "\\\\").replaceAll('"', '\\"')}"`; }
function failure(code, message, data = {}) { return Object.freeze({ diagnostics: { errors: [{ code, message, severity: "error" }], warnings: [] }, ok: false, ...data }); }
