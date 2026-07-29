import { access, chmod, copyFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import createSiteRuntimeConfigTemplate from "../runtime/createSiteRuntimeConfigTemplate.js";

export const RUNTIME_CONFIGURE_WORDPRESS_COMMAND_VERSION = "1.0";
export const WORDPRESS_RUNTIME_ENV_FILE = "config/runtime.env";
export const LEGACY_WORDPRESS_RUNTIME_ENV_FILE = "config/runtime-wordpress.env";

export default function createRuntimeConfigureWordPressCommand(options = {}) {
  const workspaceDir = path.resolve(options.workspaceDir || process.cwd());
  const write = options.write || (() => {});
  return Object.freeze({
    async run(input = {}) {
      const configPath = path.join(workspaceDir, "runtime.config.js");
      const envPath = path.join(workspaceDir, input.envFile || WORDPRESS_RUNTIME_ENV_FILE);
      const backupPath = `${configPath}.backup-${new Date().toISOString().replace(/[:.]/g, "-")}`;
      try { await access(configPath); await copyFile(configPath, backupPath); } catch (error) { if (error.code !== "ENOENT") throw error; }
      await writeFile(configPath, createSiteRuntimeConfigTemplate({ webhookBaseUrl: input.webhookBaseUrl }), "utf8");
      try { await access(envPath); } catch (error) {
        if (error.code !== "ENOENT") throw error;
        await mkdir(path.dirname(envPath), { recursive: true });
        await writeFile(envPath, "# Keep this file private. It is loaded only by wpsc runtime:serve.\nWPSC_WP_USERNAME=\nWPSC_WP_APP_PASSWORD=\n", { encoding: "utf8", mode: 0o600 });
        await chmod(envPath, 0o600);
      }
      write(`WordPress Runtime configuration ready: ${configPath}`);
      write(`Enter WordPress credentials in: ${envPath}`);
      return { backupPath: await exists(backupPath) ? backupPath : null, configPath, envPath, ok: true };
    },
    version: RUNTIME_CONFIGURE_WORDPRESS_COMMAND_VERSION
  });
}

async function exists(filePath) { try { await access(filePath); return true; } catch { return false; } }
