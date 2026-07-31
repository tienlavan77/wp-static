import createLayoutNode from "./createLayoutNode.js";
import { formatLayoutErrors } from "./layoutErrors.js";
import isPlainObject from "./isPlainObject.js";

const DEFAULT_VERSION = 1;

function normalizeContentTypes(value, errors) {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push({
      message: "Layout document must target at least one content type",
      path: "layout.contentTypes"
    });
    return [];
  }

  return Array.from(new Set(value
    .filter((contentType) => typeof contentType === "string")
    .map((contentType) => contentType.trim())
    .filter(Boolean)));
}

export function validateLayoutDocument(raw) {
  const errors = [];

  if (!isPlainObject(raw)) {
    return {
      document: null,
      errors: [{
        message: "Layout document must be an object",
        path: "layout"
      }],
      ok: false
    };
  }

  const sections = Array.isArray(raw.sections)
    ? raw.sections.map((section, index) => createLayoutNode(section, `layout.sections[${index}]`, errors))
    : [];

  if (!Array.isArray(raw.sections)) {
    errors.push({
      message: "Layout document sections must be an array",
      path: "layout.sections"
    });
  }

  const document = {
    contentTypes: normalizeContentTypes(raw.contentTypes, errors),
    id: typeof raw.id === "string" && raw.id.trim() ? raw.id.trim() : "layout",
    name: typeof raw.name === "string" && raw.name.trim() ? raw.name.trim() : "Untitled Layout",
    sections,
    version: Number.isInteger(raw.version) && raw.version > 0 ? raw.version : DEFAULT_VERSION
  };

  return {
    document,
    errors,
    ok: errors.length === 0
  };
}

export default function createLayoutDocument(raw) {
  const result = validateLayoutDocument(raw);

  if (!result.ok) {
    throw new TypeError(formatLayoutErrors(result.errors).join("; "));
  }

  return result.document;
}
