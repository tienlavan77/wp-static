import deepFreeze from "../../shared/deepFreeze.js";

export default function createMenu(rawMenu = {}) {
  return deepFreeze({
    id: rawMenu.id,
    name: rawMenu.name ?? "",
    slug: rawMenu.slug ?? "",
    items: structuredClone(rawMenu.items ?? [])
  });
}
