import { readdir } from "node:fs/promises";
import path from "node:path";
import loadTemplateDocument, { resolveTemplatesDir } from "./loadTemplateDocument.js";

export default async function createTemplateManifest(options = {}) {
  const templatesDir = options.templatesDir ?? resolveTemplatesDir(options.config, options.projectDir);

  if (options.config?.templates?.enabled === false) {
    return {
      templates: [],
      templatesDir
    };
  }

  const files = await listTemplateFiles(templatesDir);
  const templates = [];

  for (const fileName of files) {
    const filePath = path.join(templatesDir, fileName);
    const template = await loadTemplateDocument(filePath);

    templates.push({
      contentTypes: template.document.contentTypes,
      document: template.document,
      fileName,
      fingerprint: template.fingerprint,
      id: template.document.id,
      name: template.document.name,
      path: template.path,
      scope: createTemplateScope(fileName),
      version: template.document.version
    });
  }

  return {
    templates: templates.sort((left, right) => left.fileName.localeCompare(right.fileName)),
    templatesDir
  };
}

async function listTemplateFiles(dir) {
  const entries = await readdir(dir, {
    recursive: true
  });

  return entries
    .filter((fileName) => fileName.endsWith(".json"))
    .map((fileName) => fileName.split(path.sep).join("/"));
}

export function createTemplateScope(fileName) {
  const normalizedName = fileName.split(path.sep).join("/");
  const templateName = normalizedName.replace(/\.json$/u, "");

  if (templateName.startsWith("routes/")) {
    const routeSlug = templateName.slice("routes/".length);

    return `route:/${routeSlug === "index" ? "" : routeSlug.replaceAll("__", "/")}`;
  }

  if (templateName.startsWith("content/")) {
    return `content:${templateName.slice("content/".length)}`;
  }

  if (templateName.startsWith("taxonomy.")) {
    return `taxonomy:${templateName.slice("taxonomy.".length)}`;
  }

  if (templateName === "home" || templateName === "archive") {
    return templateName;
  }

  return `contentType:${templateName}`;
}
