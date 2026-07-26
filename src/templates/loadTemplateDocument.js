import { access, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { validateLayoutDocument } from "../visual-builder/createLayoutDocument.js";
import { formatLayoutErrors } from "../visual-builder/layoutErrors.js";

export async function templateExists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export default async function loadTemplateDocument(filePath) {
  const text = await readFile(filePath, "utf8");
  const raw = JSON.parse(text);
  const validation = validateLayoutDocument(raw);

  if (!validation.ok) {
    throw new TypeError(formatLayoutErrors(validation.errors).join("; "));
  }

  const info = await stat(filePath);

  return {
    document: validation.document,
    fingerprint: {
      mtimeMs: Math.trunc(info.mtimeMs),
      path: filePath,
      size: info.size
    },
    path: filePath,
    raw
  };
}

export function resolveTemplatesDir(config = {}, projectDir = process.cwd()) {
  const configuredDir = config.templates?.dir ?? config.builder?.templatesDir;

  if (typeof configuredDir === "string" && configuredDir.trim() !== "") {
    return path.resolve(projectDir, configuredDir);
  }

  return path.resolve(projectDir, "layouts", "templates");
}
