import normalizeWordPressContent from "./normalizeWordPressContent.js";

export default function createWordPressRepository(client, options = {}) {
  return {
    async getContents() {
      const contentTypes = options.contentTypes ?? ["pages"];
      const customPostTypes = options.customPostTypes ?? [];
      const collections = [];

      if (contentTypes.includes("pages")) {
        collections.push(fetchContentCollection(client, "/wp-json/wp/v2/pages", "page"));
      }

      if (contentTypes.includes("posts")) {
        collections.push(fetchContentCollection(client, "/wp-json/wp/v2/posts", "post"));
      }

      for (const postType of customPostTypes) {
        collections.push(fetchContentCollection(client, `/wp-json/wp/v2/${postType}`, postType));
      }

      const results = await Promise.all(collections);

      return results.flat();
    },

    async getTerms() {
      const taxonomies = options.taxonomies ?? [];
      const collections = taxonomies.map(async (taxonomy) => {
        const terms = await client.getCollection(`/wp-json/wp/v2/${taxonomy}`);

        return terms.map((term) => ({
          id: term.id,
          name: term.name,
          slug: term.slug,
          taxonomy
        }));
      });

      return (await Promise.all(collections)).flat();
    },

    async getMedia() {
      if (options.includeMedia !== true) {
        return [];
      }

      return client.getCollection("/wp-json/wp/v2/media");
    },

    async getMenus() {
      if (options.includeMenus !== true) {
        return [];
      }

      try {
        return await client.getCollection("/wp-json/wp/v2/menus");
      } catch {
        return [];
      }
    }
  };
}

async function fetchContentCollection(client, pathname, type) {
  const items = await client.getCollection(pathname, {
    _embed: true,
    status: "publish"
  });

  return items.map((item) => normalizeWordPressContent(item, type));
}
