import deepFreeze from "../shared/deepFreeze.js";
import createContentCollection from "./createContentCollection.js";
import createMedia from "./createMedia.js";
import createMenu from "./createMenu.js";
import createTerm from "./createTerm.js";

export default function createContentGraph(options = {}) {
  const contents = options.contents ?? [];
  const terms = (options.terms ?? collectTerms(contents)).map(createTerm);
  const media = (options.media ?? collectMedia(contents)).map(createMedia);
  const menus = (options.menus ?? []).map(createMenu);
  const contentCollection = createContentCollection(contents);

  return deepFreeze({
    contents: contentCollection,
    terms: createIndexCollection(terms, "taxonomy"),
    media: createIndexCollection(media, "mimeType"),
    menus: createIndexCollection(menus),
    findContentById(id) {
      return contentCollection.byId[id] ?? null;
    },
    findContentBySlug(slug) {
      return contentCollection.bySlug[slug] ?? null;
    },
    findContentsByType(type) {
      return contentCollection.byType[type] ?? [];
    },
    findContentsByTerm(termSlug) {
      return contents.filter((content) => {
        const contentTerms = content.data?.terms ?? [];

        return contentTerms.some((term) => term.slug === termSlug);
      });
    }
  });
}

function createIndexCollection(items, groupKey = null) {
  const byId = new Map();
  const bySlug = new Map();
  const byGroup = new Map();

  for (const item of items) {
    if (item.id !== undefined && item.id !== null) {
      byId.set(String(item.id), item);
    }

    if (item.slug) {
      bySlug.set(item.slug, item);
    }

    if (groupKey && item[groupKey]) {
      const groupItems = byGroup.get(item[groupKey]) ?? [];
      groupItems.push(item);
      byGroup.set(item[groupKey], groupItems);
    }
  }

  return {
    items,
    byId: Object.fromEntries(byId),
    bySlug: Object.fromEntries(bySlug),
    byGroup: Object.fromEntries(byGroup)
  };
}

function collectTerms(contents) {
  return contents.flatMap((content) => content.data?.terms ?? []);
}

function collectMedia(contents) {
  return contents
    .flatMap((content) => [content.data?.featuredImage, ...(content.data?.images ?? [])])
    .filter(Boolean);
}
