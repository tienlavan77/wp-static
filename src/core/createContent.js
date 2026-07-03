import deepFreeze from "../shared/deepFreeze.js";

const REQUIRED_STRING_FIELDS = ["id", "type", "title", "slug", "domain"];

export default function createContent(rawContent) {
  if (!isPlainObject(rawContent)) {
    throw new Error("Content must be a plain object.");
  }

  for (const fieldName of REQUIRED_STRING_FIELDS) {
    assertRequiredString(rawContent, fieldName);
  }

  if (!Object.hasOwn(rawContent, "data")) {
    throw new Error('Content field "data" is required.');
  }

  if (!isJsonLikeValue(rawContent.data)) {
    throw new Error('Content field "data" must be JSON-like data.');
  }

  const content = {
    id: rawContent.id.trim(),
    type: rawContent.type.trim(),
    title: rawContent.title.trim(),
    slug: rawContent.slug.trim(),
    domain: rawContent.domain.trim(),
    data: structuredClone(rawContent.data)
  };

  return deepFreeze(content);
}

function assertRequiredString(rawContent, fieldName) {
  const value = rawContent[fieldName];

  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Content field "${fieldName}" is required.`);
  }
}

function isPlainObject(value) {
  if (value === null || typeof value !== "object") {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);

  return prototype === Object.prototype || prototype === null;
}

function isJsonLikeValue(value) {
  if (value === null) {
    return true;
  }

  if (["string", "number", "boolean"].includes(typeof value)) {
    return true;
  }

  if (Array.isArray(value)) {
    return value.every(isJsonLikeValue);
  }

  if (isPlainObject(value)) {
    return Object.values(value).every(isJsonLikeValue);
  }

  return false;
}
