import deepFreeze from "../shared/deepFreeze.js";

export default function createTerm(rawTerm = {}) {
  return deepFreeze({
    count: rawTerm.count ?? rawTerm.data?.count ?? 0,
    data: rawTerm.data ?? {},
    description: rawTerm.description ?? rawTerm.data?.description ?? "",
    id: rawTerm.id,
    image: rawTerm.image ?? rawTerm.data?.image ?? null,
    link: rawTerm.link ?? rawTerm.data?.link ?? null,
    menuOrder: rawTerm.menuOrder ?? rawTerm.menu_order ?? rawTerm.data?.menuOrder ?? 0,
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
