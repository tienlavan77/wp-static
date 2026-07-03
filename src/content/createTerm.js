import deepFreeze from "../shared/deepFreeze.js";

export default function createTerm(rawTerm = {}) {
  return deepFreeze({
    id: rawTerm.id,
    name: rawTerm.name ?? "",
    slug: rawTerm.slug ?? "",
    taxonomy: rawTerm.taxonomy ?? rawTerm.type ?? ""
  });
}
