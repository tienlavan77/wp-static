import { access, chmod, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import createSiteRepository from "../site/createSiteRepository.js";
import createSiteRuntimeConfigTemplate from "../runtime/bootstrap/createSiteRuntimeConfigTemplate.js";

export const RUNTIME_PLATFORM_PROVISIONING_VERSION = "1.0";

function required(value, name) {
  const result = String(value || "").trim();
  if (!result) throw new Error(`Platform provisioning requires ${name}.`);
  return result;
}

function normalizeDomain(value) {
  const domain = required(value, "--domain").toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "");
  if (!/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(domain)) throw new Error("Platform provisioning requires a valid DNS domain.");
  return domain;
}

async function exists(filePath) { try { await access(filePath); return true; } catch { return false; } }
async function writePrivate(filePath, contents) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, contents, { encoding: "utf8", mode: 0o600 });
  await chmod(filePath, 0o600);
}

function serviceTemplate({ nodePath, port, workspaceDir, serviceGroup, serviceUser }) {
  return `[Unit]\nDescription=WPSC Shared Site Runtime\nAfter=network.target\n\n[Service]\nType=simple\nUser=${serviceUser}\nGroup=${serviceGroup}\nWorkingDirectory=${workspaceDir}\nEnvironmentFile=${workspaceDir}/config/runtime.env\nExecStart=${nodePath} framework/src/cli/index.js runtime:serve --config runtime.config.js --project ${workspaceDir} --host 127.0.0.1 --port ${port}\nRestart=always\nRestartSec=3\n\n[Install]\nWantedBy=multi-user.target\n`;
}

function nginxTemplate({ domain, publicDir, runtimeOrigin }) {
  return `server {\n    listen 80;\n    listen [::]:80;\n    server_name ${domain} www.${domain};\n\n    root ${publicDir};\n    index index.php index.html;\n\n    location / {\n        try_files $uri $uri/ /index.php?$query_string;\n    }\n\n    location ~ \\.php$ {\n        include snippets/fastcgi-php.conf;\n        fastcgi_param WPSC_RUNTIME_ORIGIN ${runtimeOrigin};\n        fastcgi_pass unix:/run/php/php8.3-fpm.sock;\n    }\n\n    location ~ ^/(config|storage|dist/.*\\.map)/ { deny all; }\n    location ~ /\\. { deny all; }\n}\n`;
}

export default function createRuntimePlatformProvisioningService(options = {}) {
  const workspaceDir = path.resolve(options.workspaceDir || process.cwd());
  const repository = options.repository || createSiteRepository({ workspaceDir });
  return Object.freeze({
    async provision(input = {}) {
      const siteId = required(input.siteId, "--site");
      const domain = normalizeDomain(input.domain);
      const port = Number(input.port || 8787);
      if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Platform provisioning requires a valid --port.");
      await repository.readMetadata(siteId);
      const webhookBaseUrl = String(input.webhookBaseUrl || `https://${domain}/webhook`).replace(/\/$/, "");
      const runtimeOrigin = String(input.runtimeOrigin || `http://127.0.0.1:${port}`).replace(/\/$/, "");
      const deployDir = path.join(workspaceDir, "deploy");
      const runtimeConfigPath = path.join(workspaceDir, "runtime.config.js");
      const environmentPath = path.join(workspaceDir, "config", "runtime.env");
      const servicePath = path.join(deployDir, "systemd", "wpsc-runtime.service");
      const nginxPath = path.join(deployDir, "nginx", `${domain}.conf`);
      const activationPath = path.join(deployDir, "ACTIVATE_RUNTIME.md");
      if (!await exists(runtimeConfigPath)) await writeFile(runtimeConfigPath, createSiteRuntimeConfigTemplate({ webhookBaseUrl }), "utf8");
      if (!await exists(environmentPath)) await writePrivate(environmentPath, "# Private Runtime credentials. Do not commit this file.\nWPSC_WP_USERNAME=\nWPSC_WP_APP_PASSWORD=\nWPSC_AUTH_BRIDGE_SECRET=\n");
      await mkdir(path.dirname(servicePath), { recursive: true });
      await mkdir(path.dirname(nginxPath), { recursive: true });
      await writeFile(servicePath, serviceTemplate({ nodePath: input.nodePath || "/usr/bin/node", port, workspaceDir, serviceGroup: input.serviceGroup || "www-data", serviceUser: input.serviceUser || "www-data" }), "utf8");
      await writeFile(nginxPath, nginxTemplate({ domain, publicDir: path.join(repository.resolveSiteRoot(siteId), "public"), runtimeOrigin }), "utf8");
      await writeFile(activationPath, `# Activate WPSC Runtime\n\nGenerated for \`${domain}\` / Site \`${siteId}\`.\n\n\`\`\`bash\nsudo cp ${servicePath} /etc/systemd/system/wpsc-runtime.service\nsudo cp ${nginxPath} /etc/nginx/sites-available/${domain}\nsudo ln -sf /etc/nginx/sites-available/${domain} /etc/nginx/sites-enabled/${domain}\nsudo systemctl daemon-reload\nsudo systemctl enable --now wpsc-runtime\nsudo nginx -t && sudo systemctl reload nginx\n\`\`\`\n\nSet real credentials in \`${environmentPath}\` before starting Runtime.\n`, "utf8");
      return Object.freeze({ activationPath, domain, environmentPath, nginxPath, ok: true, runtimeConfigPath, servicePath, siteId });
    },
    version: RUNTIME_PLATFORM_PROVISIONING_VERSION
  });
}
