import { access, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import createInstallationLock from "./createInstallationLock.js";
import createReleasePackageStructure from "./createReleasePackageStructure.js";

export const RELEASE_VALIDATION_VERSION = "1.0";

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

async function canWrite(directoryPath) {
  const probePath = path.join(directoryPath, `.wpsc-write-test-${process.pid}`);
  try {
    await writeFile(probePath, "ok", "utf8");
    await unlink(probePath);
    return true;
  } catch {
    return false;
  }
}

function check(ok, code, message, detail = {}, level = "error") {
  return {
    code,
    detail,
    level: ok ? "ok" : level,
    message,
    ok,
    status: ok ? "OK" : level === "warning" ? "Warning" : "Error"
  };
}

async function readManifest(manifestPath) {
  try {
    return {
      manifest: JSON.parse(await readFile(manifestPath, "utf8")),
      ok: true
    };
  } catch (error) {
    return {
      error,
      manifest: null,
      ok: false
    };
  }
}

export default async function validateReleasePackage(options = {}) {
  const releaseDir = path.resolve(options.releaseDir || process.cwd());
  const structure = createReleasePackageStructure({
    mode: options.mode,
    packageName: options.packageName
  });
  const checks = [];

  checks.push(check(await exists(releaseDir), "release.root.exists", "Release directory exists.", {
    releaseDir
  }));

  for (const directory of structure.directories) {
    const directoryPath = path.join(releaseDir, directory);
    checks.push(check(await exists(directoryPath), "release.directory.exists", `Required directory exists: ${directory}`, {
      directory,
      directoryPath
    }));
  }

  for (const file of structure.files) {
    const filePath = path.join(releaseDir, file.path);
    checks.push(check(await exists(filePath), "release.file.exists", `Required file exists: ${file.path}`, {
      filePath,
      path: file.path,
      purpose: file.purpose
    }));
  }

  const manifestPath = path.join(releaseDir, "release-manifest.json");
  const manifestResult = await readManifest(manifestPath);
  checks.push(check(manifestResult.ok, "release.manifest.readable", "Release manifest is readable JSON.", {
    manifestPath
  }));

  if (manifestResult.ok) {
    checks.push(check(
      manifestResult.manifest.releaseBuilderVersion != null,
      "release.manifest.builder_version",
      "Release manifest includes builder version.",
      {
        value: manifestResult.manifest.releaseBuilderVersion || null
      }
    ));
    checks.push(check(
      manifestResult.manifest.publicRoot === structure.publicRoot,
      "release.manifest.public_root",
      "Release manifest public root matches release structure.",
      {
        expected: structure.publicRoot,
        value: manifestResult.manifest.publicRoot || null
      }
    ));
  }

  for (const directory of ["config", "storage", "storage/reports", "public"]) {
    const directoryPath = path.join(releaseDir, directory);
    checks.push(check(await canWrite(directoryPath), "release.directory.writable", `Writable directory: ${directory}`, {
      directory,
      directoryPath
    }));
  }

  const lock = createInstallationLock({
    releaseDir
  });
  const lockState = await lock.read();
  checks.push(check(!lockState.corrupt, "release.lock.readable", "Installation lock state is readable.", {
    lockPath: lock.lockPath
  }));
  checks.push(check(
    lockState.installed === true,
    "release.lock.installed",
    "Installation lock exists after completed install.",
    {
      installed: lockState.installed,
      lockPath: lock.lockPath
    },
    "warning"
  ));

  const errors = checks.filter((item) => item.level === "error");
  const warnings = checks.filter((item) => item.level === "warning");

  return {
    checks,
    diagnostics: {
      errors,
      warnings
    },
    manifest: manifestResult.manifest,
    ok: errors.length === 0,
    releaseDir,
    version: RELEASE_VALIDATION_VERSION
  };
}
