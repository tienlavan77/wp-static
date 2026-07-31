import normalizeWordPressContent from "./normalizeWordPressContent.js";
import normalizeWordPressMedia from "./normalizeWordPressMedia.js";
import { normalizeWordPressAuthor, normalizeWordPressTerm } from "../../source/wordpressContentContract.js";
import createNavigationService from "../../navigation/createNavigationService.js";

export default function createWordPressRepository(client, options = {}) {
  const navigation = createNavigationService({ siteUrl: options.siteUrl ?? options.baseUrl });
  return {
    async getContents() {
      const contentTypes = options.contentTypes ?? ["pages", "posts"];
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
      const taxonomies = options.taxonomies ?? ["categories", "tags"];
      const collections = taxonomies.map(async (taxonomy) => {
        const terms = await client.getCollection(`/wp-json/wp/v2/${taxonomy}`);
        const normalizedTaxonomy = normalizeTaxonomyName(taxonomy);

        return terms.map((term) => ({
          ...normalizeWordPressTerm({
            count: term.count ?? 0,
            description: term.description ?? "",
            id: term.id,
            link: term.link ?? null,
            name: term.name,
            parentId: term.parent ?? null,
            slug: term.slug,
            taxonomy: normalizedTaxonomy
          }),
          // Existing consumers read this legacy metadata bag; retain it while
          // the stable top-level term fields become the provider contract.
          data: {
            count: term.count ?? 0,
            description: term.description ?? "",
            link: term.link ?? null
          }
        }));
      });

      return (await Promise.all(collections)).flat();
    },

    async getMedia() {
      if (options.includeMedia !== true) {
        return [];
      }

      const media = await client.getCollection("/wp-json/wp/v2/media");
      return media.map(normalizeWordPressMedia);
    },

    async getMenus() {
      if (options.includeMenus === false) {
        return [];
      }

      try {
        const menus = await client.getCollection(options.menuEndpoint ?? "/wp-json/wp/v2/menus");
        const itemsByMenu = new Map(await Promise.all(menus.map(async (menu) => [
          String(menu.id),
          await getMenuItems(client, menu, options)
        ])));

        return navigation.normalizeMenus(menus, itemsByMenu);
      } catch {
        return [];
      }
    },

    async getAuthors() {
      if (options.includeAuthors === false) return [];

      try {
        const authors = await client.getCollection("/wp-json/wp/v2/users", {
          context: "embed",
          who: "authors"
        });

        return authors.map(normalizeWordPressAuthor);
      } catch (error) {
        // Many WordPress roles cannot list users. Embedded authors still keep
        // the content contract useful without failing the complete Site build.
        if (options.strictAuthors === true) throw error;
        return [];
      }
    }
  };
}

async function getMenuItems(client, menu, options) {
  if (Array.isArray(menu.items)) return menu.items;
  const endpoint = options.menuItemsEndpoint ?? "/wp-json/wp/v2/menu-items";
  const menuId = menu.id ?? menu.slug;
  if (menuId === null || menuId === undefined) return [];

  try {
    return await client.getCollection(endpoint, {
      menus: menuId,
      per_page: 100
    });
  } catch {
    return [];
  }
}

function normalizeTaxonomyName(taxonomy) {
  if (taxonomy === "categories") {
    return "category";
  }

  if (taxonomy === "tags") {
    return "post_tag";
  }

  return taxonomy;
}

async function fetchContentCollection(client, pathname, type) {
  const items = await client.getCollection(pathname, {
    _embed: true,
    status: "publish"
  });

  return items.map((item) => normalizeWordPressContent(item, type));
}
