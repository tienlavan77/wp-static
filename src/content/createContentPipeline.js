import deepFreeze from "../shared/deepFreeze.js";

export const CONTENT_PIPELINE_VERSION = "1.0";

function diagnostic(code, message) {
  return { code, message, severity: "error" };
}

export function normalizeContent(raw = {}) {
  const id = raw.id === undefined || raw.id === null ? "" : String(raw.id).trim();
  const type = typeof raw.type === "string" ? raw.type.trim() : "";
  const slug = typeof raw.slug === "string" ? raw.slug.trim() : "";
  if (!id || !type || !slug) return null;
  return deepFreeze({
    data: deepFreeze({ ...(raw.data || {}) }),
    id,
    slug,
    title: typeof raw.title === "string" ? raw.title : "",
    type
  });
}

export function createContentModel(items = []) {
  return deepFreeze({
    items: deepFreeze([...items]),
    total: items.length
  });
}

export default function createContentPipeline(options = {}) {
  const transformers = options.transformers || [];
  const filters = options.filters || [];
  if (!transformers.every((transformer) => typeof transformer === "function") || !filters.every((filter) => typeof filter === "function")) {
    throw new TypeError("Content pipeline transformers and filters must be functions.");
  }

  function run(rawItems = []) {
    if (!Array.isArray(rawItems)) {
      return { diagnostics: { errors: [diagnostic("content.pipeline.input.invalid", "Content pipeline input must be an array.")], warnings: [] }, ok: false };
    }
    const normalized = rawItems.map(normalizeContent);
    if (normalized.some((item) => item === null)) {
      return { diagnostics: { errors: [diagnostic("content.pipeline.content.invalid", "Content requires id, type, and slug.")], warnings: [] }, ok: false };
    }
    try {
      const transformed = normalized.map((item) => transformers.reduce((current, transform) => transform(current), item));
      const filtered = transformed.filter((item) => filters.every((filter) => filter(item)));
      return { diagnostics: { errors: [], warnings: [] }, model: createContentModel(filtered), ok: true };
    } catch (error) {
      return { diagnostics: { errors: [diagnostic("content.pipeline.processing.failed", error.message)], warnings: [] }, ok: false };
    }
  }
  return Object.freeze({ run, version: CONTENT_PIPELINE_VERSION });
}
