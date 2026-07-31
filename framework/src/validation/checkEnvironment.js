import { access, constants, mkdir } from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import {
  createError,
  createOk,
  createWarning
} from "./createValidationResult.js";

const execFileAsync = promisify(execFile);

export async function checkNodeVersion(options = {}) {
  const minimumMajor = options.minimumMajor ?? 20;
  const version = options.version ?? process.version;
  const major = Number.parseInt(version.replace(/^v/, "").split(".")[0], 10);

  if (Number.isFinite(major) && major >= minimumMajor) {
    return createOk(`Node.js >= ${minimumMajor}`, version, {
      category: "environment",
      summary: `Node.js ${version} is supported.`
    });
  }

  return createError(`Node.js >= ${minimumMajor}`, version, {
    category: "environment",
    fix: `Install Node.js ${minimumMajor} or newer, then run the command again.`,
    summary: `Node.js ${version} is below the required major version.`
  });
}

export async function checkPhpVersion(options = {}) {
  const minimumMajor = options.minimumMajor ?? 8;
  const phpBinary = options.phpBinary ?? "php";

  try {
    const { stdout, stderr } = await execFileAsync(phpBinary, ["-r", "echo PHP_VERSION;"], {
      timeout: options.timeoutMs ?? 3000
    });
    const version = String(stdout || stderr || "").trim();
    const major = Number.parseInt(version.split(".")[0], 10);

    if (Number.isFinite(major) && major >= minimumMajor) {
      return createOk(`PHP >= ${minimumMajor}`, version, {
        category: "environment",
        summary: `PHP ${version} is available.`
      });
    }

    return createError(`PHP >= ${minimumMajor}`, version || "unknown", {
      category: "environment",
      fix: `Install PHP ${minimumMajor} or newer for WordPress/plugin tooling.`,
      summary: "PHP is available but below the required major version."
    });
  } catch (error) {
    return createWarning(`PHP >= ${minimumMajor}`, error.message, {
      category: "environment",
      fix: "Install PHP or run this check on the WordPress/VPS environment.",
      summary: "PHP is not available in this shell."
    });
  }
}

export async function checkReadablePath(targetPath, name, options = {}) {
  try {
    await access(targetPath, constants.R_OK);

    return createOk(name, targetPath, {
      category: options.category ?? "filesystem",
      summary: `${name} is readable.`
    });
  } catch {
    return createError(name, targetPath, {
      category: options.category ?? "filesystem",
      fix: options.fix ?? `Create the path or fix permissions: ${targetPath}`,
      summary: `${name} is missing or not readable.`
    });
  }
}

export async function checkWritableDirectory(targetPath, name, options = {}) {
  try {
    await mkdir(targetPath, { recursive: true });
    await access(targetPath, constants.W_OK);

    return createOk(name, targetPath, {
      category: options.category ?? "filesystem",
      summary: `${name} is writable.`
    });
  } catch {
    return createError(name, targetPath, {
      category: options.category ?? "filesystem",
      fix: options.fix ?? `Create the directory or grant write permission: ${targetPath}`,
      summary: `${name} is not writable.`
    });
  }
}
