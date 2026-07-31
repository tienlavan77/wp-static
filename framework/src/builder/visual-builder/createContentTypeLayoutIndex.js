import createLayoutDocument from "./createLayoutDocument.js";

export default function createContentTypeLayoutIndex(layouts = []) {
  const documents = layouts.map((layout) => createLayoutDocument(layout));
  const byContentType = new Map();

  for (const document of documents) {
    for (const contentType of document.contentTypes) {
      if (byContentType.has(contentType)) {
        throw new TypeError(`Duplicate layout mapping for content type "${contentType}"`);
      }

      byContentType.set(contentType, document);
    }
  }

  return {
    all() {
      return [...documents];
    },
    find(contentType) {
      return byContentType.get(contentType) ?? byContentType.get("default") ?? null;
    },
    has(contentType) {
      return byContentType.has(contentType);
    }
  };
}
