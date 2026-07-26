import path from "node:path";
import loadTemplateDocument, { resolveTemplatesDir, templateExists } from "./loadTemplateDocument.js";

export default async function resolveTemplateForRoute(route, options = {}) {
  if (options.config?.templates?.enabled === false) {
    return null;
  }

  const templatesDir = options.templatesDir ?? resolveTemplatesDir(options.config, options.projectDir);
  const candidates = createTemplateCandidates(route);

  for (const candidate of candidates) {
    const filePath = path.join(templatesDir, candidate.fileName);

    if (await templateExists(filePath)) {
      const template = await loadTemplateDocument(filePath);

      return {
        ...template,
        scope: candidate.scope
      };
    }
  }

  return null;
}

export function createTemplateCandidates(route) {
  const candidates = [];
  const content = route?.content;

  if (route?.path) {
    candidates.push({
      fileName: path.join("routes", `${safeTemplateName(route.path === "/" ? "index" : route.path)}.json`),
      scope: `route:${route.path}`
    });
  }

  if (content?.id) {
    candidates.push({
      fileName: path.join("content", `${safeTemplateName(content.id)}.json`),
      scope: `content:${content.id}`
    });
  }

  if (route?.path === "/") {
    candidates.push({
      fileName: "home.json",
      scope: "home"
    });
  }

  if (route?.archive?.taxonomy) {
    candidates.push({
      fileName: `taxonomy.${safeTemplateName(route.archive.taxonomy)}.json`,
      scope: `taxonomy:${route.archive.taxonomy}`
    });
  }

  if (content?.type && !String(content.type).startsWith("archive:")) {
    candidates.push({
      fileName: `${safeTemplateName(content.type)}.json`,
      scope: `contentType:${content.type}`
    });
  }

  if (route?.type === "archive" || String(content?.type ?? "").startsWith("archive:")) {
    candidates.push({
      fileName: "archive.json",
      scope: "archive"
    });
  }

  return dedupeCandidates(candidates);
}

function dedupeCandidates(candidates) {
  const seen = new Set();

  return candidates.filter((candidate) => {
    if (seen.has(candidate.fileName)) {
      return false;
    }

    seen.add(candidate.fileName);
    return true;
  });
}

function safeTemplateName(value) {
  return String(value ?? "")
    .trim()
    .replace(/^\/+|\/+$/g, "")
    .replaceAll("/", "__")
    .replaceAll(/[^A-Za-z0-9_.:-]+/g, "-")
    .replace(/^-|-$/g, "") || "index";
}
