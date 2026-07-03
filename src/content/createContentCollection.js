import deepFreeze from "../shared/deepFreeze.js";

export default function createContentCollection(contents = []) {
  const items = [...contents];
  const byId = new Map(items.map((content) => [content.id, content]));
  const bySlug = new Map(items.map((content) => [content.slug, content]));
  const byType = new Map();

  for (const content of items) {
    const typeItems = byType.get(content.type) ?? [];
    typeItems.push(content);
    byType.set(content.type, typeItems);
  }

  return deepFreeze({
    items,
    byId: Object.fromEntries(byId),
    bySlug: Object.fromEntries(bySlug),
    byType: Object.fromEntries([...byType.entries()])
  });
}
