import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export const INSTALLATION_LOCK_VERSION = "1.0";

function createLockError(code, message, detail = {}) {
  const error = new Error(message);
  error.code = code;
  error.detail = detail;
  return error;
}

async function writeJsonAtomic(filePath, value) {
  const directory = path.dirname(filePath);
  const tempPath = path.join(directory, `.${path.basename(filePath)}.${process.pid}.tmp`);
  await mkdir(directory, { recursive: true });
  await writeFile(tempPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(tempPath, filePath);
  return filePath;
}

function safeTimestamp(value) {
  return String(value).replace(/[^0-9A-Za-z.-]/g, "-");
}

export default function createInstallationLock(options = {}) {
  const releaseDir = path.resolve(options.releaseDir || process.cwd());
  const configDir = path.resolve(releaseDir, options.configDir || "config");
  const lockPath = path.resolve(configDir, options.lockFile || "install.lock");

  async function read() {
    try {
      const raw = await readFile(lockPath, "utf8");
      const lock = JSON.parse(raw);
      return {
        exists: true,
        installed: lock.installed !== false,
        lockPath,
        ...lock
      };
    } catch (error) {
      if (error.code === "ENOENT") {
        return {
          exists: false,
          installed: false,
          lockPath,
          version: INSTALLATION_LOCK_VERSION
        };
      }

      if (error instanceof SyntaxError) {
        return {
          corrupt: true,
          diagnostics: {
            errors: [
              {
                code: "install.lock.corrupt",
                detail: {
                  lockPath
                },
                message: "Installation lock file is corrupt."
              }
            ],
            warnings: []
          },
          exists: true,
          installed: true,
          lockPath,
          version: INSTALLATION_LOCK_VERSION
        };
      }

      throw error;
    }
  }

  async function isInstalled() {
    return (await read()).installed === true;
  }

  async function assertNotInstalled() {
    const lock = await read();
    if (lock.corrupt) {
      throw createLockError(
        "install.lock.corrupt",
        "Installation lock is corrupt. Recover the installation before running installer again.",
        {
          lockPath
        }
      );
    }
    if (lock.installed) {
      throw createLockError("install.lock.exists", "WPSC is already installed.", {
        installedAt: lock.installedAt || null,
        lockPath
      });
    }
    return true;
  }

  async function create(details = {}) {
    if (details.force !== true) {
      await assertNotInstalled();
    }

    const now = details.installedAt || new Date().toISOString();
    const lock = {
      ...details,
      installed: true,
      installedAt: now,
      lockPath,
      version: INSTALLATION_LOCK_VERSION
    };
    delete lock.force;

    await writeJsonAtomic(lockPath, lock);
    return lock;
  }

  async function recover(options = {}) {
    const lock = await read();
    const recoveredAt = options.recoveredAt || new Date().toISOString();
    const reason = options.reason || "manual-recovery";

    if (!lock.exists) {
      return {
        action: "none",
        archivedPath: null,
        lock,
        ok: true,
        recoveredAt,
        reason
      };
    }

    if (options.confirmed !== true) {
      throw createLockError(
        "install.recovery.confirmation_required",
        "Installation recovery requires explicit confirmation.",
        {
          lockPath,
          reason
        }
      );
    }

    const archivedPath = path.join(
      configDir,
      `install.lock.recovered.${safeTimestamp(recoveredAt)}.json`
    );
    await mkdir(configDir, {
      recursive: true
    });
    await rename(lockPath, archivedPath);

    return {
      action: "archived-lock",
      archivedPath,
      lock,
      ok: true,
      recoveredAt,
      reason
    };
  }

  return {
    assertNotInstalled,
    configDir,
    create,
    isInstalled,
    lockPath,
    read,
    recover,
    releaseDir,
    version: INSTALLATION_LOCK_VERSION
  };
}
