import deepFreeze from "../shared/deepFreeze.js";

export const WORDPRESS_CONTENT_CONTRACT_SCHEMA = "wpsc.wordpress-content";
export const WORDPRESS_CONTENT_CONTRACT_VERSION = 1;

// This is the Builder-facing provider document. It deliberately contains no
// WordPress REST response objects, so consumers do not couple to WordPress.
export function createWordPressContentContract(input = {}) {
  const contents = Array.isArray(input.contents) ? input.contents : [];
  const terms = Array.isArray(input.terms) ? input.terms : [];
  const authors = Array.isArray(input.authors) ? input.authors : [];

  return deepFreeze({
    authors: authors.map(normalizeAuthor),
    contents,
    provider: "wordpress",
    schema: WORDPRESS_CONTENT_CONTRACT_SCHEMA,
    schemaVersion: WORDPRESS_CONTENT_CONTRACT_VERSION,
    terms: terms.map(normalizeTerm)
  });
}

export function normalizeWordPressAuthor(author = {}) {
  return normalizeAuthor(author);
}

export function normalizeWordPressTerm(term = {}) {
  return normalizeTerm(term);
}

function normalizeAuthor(author) {
  const id = author.id ?? author.authorId ?? null;

  return {
    avatarUrl: author.avatar_urls?.["96"] ?? author.avatarUrl ?? null,
    description: author.description ?? "",
    id: id === null ? null : String(id),
    name: author.name ?? author.slug ?? "",
    slug: author.slug ?? (id === null ? "" : String(id)),
    url: author.link ?? author.url ?? null
  };
}

function normalizeTerm(term) {
  return {
    count: term.count ?? 0,
    description: term.description ?? "",
    id: String(term.id),
    link: term.link ?? null,
    name: term.name ?? "",
    parentId: term.parentId ?? term.parent ?? null,
    slug: term.slug ?? String(term.id),
    taxonomy: term.taxonomy ?? ""
  };
}
