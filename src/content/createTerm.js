import deepFreeze from "../shared/deepFreeze.js";

export default function createTerm(rawTerm = {}) {
  return deepFreeze({
    id: rawTerm.id,
    name: rawTerm.name ?? "",
    parentId: normalizeParentId(rawTerm.parentId ?? rawTerm.parent),
    parentSlug: rawTerm.parentSlug ?? null,
    slug: rawTerm.slug ?? "",
    taxonomy: rawTerm.taxonomy ?? rawTerm.type ?? ""
  });
}

function normalizeParentId(value) {
  if (value === undefined || value === null || value === 0 || value === "0") {
    return null;
  }

  return value;
}
