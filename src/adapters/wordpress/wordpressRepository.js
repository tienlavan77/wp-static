import normalizeWordPressContent from "./normalizeWordPressContent.js";

export default function createWordPressRepository(client) {
  return {
    async getContents() {
      const pages = await client.getJson("/wp-json/wp/v2/pages");

      return pages.map((page) => normalizeWordPressContent(page, "page"));
    }
  };
}
