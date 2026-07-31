import deepFreeze from "../shared/deepFreeze.js";

export const NAVIGATION_CONTRACT_SCHEMA = "wpsc.navigation";
export const NAVIGATION_CONTRACT_VERSION = 1;

// WordPress can expose menus through different REST plugins. This service
// accepts their common item fields and emits one stable, theme-facing tree.
export default function createNavigationService(options = {}) {
  const siteUrl = normalizeOrigin(options.siteUrl);
  const normalizeMenu = (menu, items = []) => {
    const normalizedItems = items.map((item) => normalizeItem(item, siteUrl));

    return deepFreeze({
      id: String(menu.id ?? menu.slug ?? "default"),
      items: createTree(normalizedItems),
      name: text(menu.name ?? menu.title ?? menu.slug ?? "Navigation"),
      schema: NAVIGATION_CONTRACT_SCHEMA,
      schemaVersion: NAVIGATION_CONTRACT_VERSION,
      slug: text(menu.slug ?? menu.id ?? "default")
    });
  };

  return Object.freeze({
    normalizeMenu,
    normalizeMenus(menus = [], itemsByMenu = new Map()) {
      return deepFreeze(
        [...menus]
          .map((menu) => normalizeMenu(menu, itemsByMenu.get(String(menu.id)) ?? menu.items ?? []))
          .sort(compareByOrderAndId)
      );
    }
  });
}

function normalizeItem(item, siteUrl) {
  const id = String(item.id ?? item.ID ?? item.db_id ?? item.object_id ?? item.title ?? item.url ?? "item");
  const parentValue = item.parentId ?? item.parent ?? item.menu_item_parent ?? 0;
  const parentId = parentValue === 0 || parentValue === "0" || parentValue === "" || parentValue === null || parentValue === undefined
    ? null
    : String(parentValue);
  const href = normalizeHref(item.url ?? item.href ?? item.link ?? "#", siteUrl);

  return {
    children: [],
    id,
    label: text(item.title?.rendered ?? item.title ?? item.name ?? item.label ?? href),
    order: numericOrder(item.menu_order ?? item.order ?? item.position),
    parentId,
    target: item.target ?? null,
    type: text(item.type ?? item.object ?? "custom"),
    url: href
  };
}

function createTree(items) {
  const byId = new Map(items.map((item) => [item.id, item]));
  const roots = [];

  for (const item of items) {
    const parent = item.parentId ? byId.get(item.parentId) : null;
    if (parent && parent !== item) parent.children.push(item);
    else roots.push(item);
  }

  return sortTree(roots);
}

function sortTree(items) {
  return items
    .sort(compareByOrderAndId)
    .map((item) => ({
      ...item,
      children: sortTree(item.children)
    }));
}

function compareByOrderAndId(first, second) {
  const firstOrder = numericOrder(first.menu_order ?? first.order);
  const secondOrder = numericOrder(second.menu_order ?? second.order);
  return firstOrder - secondOrder || String(first.id ?? first.slug).localeCompare(String(second.id ?? second.slug));
}

function normalizeHref(value, siteUrl) {
  const href = text(value || "#");
  if (!href || href === "#") return "#";

  try {
    const url = new URL(href, siteUrl || undefined);
    if (siteUrl && url.origin === siteUrl) return `${url.pathname}${url.search}${url.hash}` || "/";
  } catch {
    return href;
  }

  return href;
}

function normalizeOrigin(value) {
  if (!value) return null;
  try { return new URL(value).origin; } catch { return null; }
}

function numericOrder(value) {
  const order = Number(value);
  return Number.isFinite(order) ? order : 0;
}

function text(value) {
  return String(value ?? "").replace(/<[^>]*>/g, "").trim();
}
