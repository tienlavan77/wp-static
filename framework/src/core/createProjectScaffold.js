import { mkdir, readdir, stat, copyFile } from "node:fs/promises";
import path from "node:path";

export const STARTER_TEMPLATES = [
  "blank",
  "blog",
  "catalog",
  "commerce",
  "corporate"
];

export default async function createProjectScaffold(projectName, options = {}) {
  if (!projectName) {
    throw new Error("Project name is required.");
  }

  const template = normalizeTemplate(options.template);
  const targetDir = path.resolve(projectName);
  const templateDir = path.resolve(options.templatesDir ?? "templates", template);

  try {
    await stat(targetDir);
    throw new Error(`Project already exists: ${targetDir}`);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }

  await stat(templateDir);
  await mkdir(path.dirname(targetDir), { recursive: true });
  await mkdir(targetDir, { recursive: false });

  const files = [];
  await copyTemplateDirectory(templateDir, targetDir, files);

  return {
    files,
    projectDir: targetDir,
    template,
    templateDir
  };
}

export function normalizeTemplate(template) {
  const normalized = String(template ?? "commerce").trim().toLowerCase();

  if (!STARTER_TEMPLATES.includes(normalized)) {
    throw new Error(`Unknown starter template "${normalized}". Use one of: ${STARTER_TEMPLATES.join(", ")}.`);
  }

  return normalized;
}

async function copyTemplateDirectory(sourceDir, targetDir, files) {
  const entries = await readdir(sourceDir, {
    withFileTypes: true
  });

  for (const entry of entries) {
    if (shouldIgnoreEntry(entry.name)) {
      continue;
    }

    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);

    if (entry.isDirectory()) {
      await mkdir(targetPath, { recursive: true });
      await copyTemplateDirectory(sourcePath, targetPath, files);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    await copyFile(sourcePath, targetPath);
    files.push(targetPath);
  }
}

function shouldIgnoreEntry(name) {
  return name === ".DS_Store";
}
