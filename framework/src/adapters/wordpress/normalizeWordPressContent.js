import normalizeRankMathSeo from "./normalizeRankMathSeo.js";
import normalizeWordPressMedia from "./normalizeWordPressMedia.js";
import toJsonData from "../../shared/toJsonData.js";
import { normalizeWordPressAuthor } from "../../source/wordpressContentContract.js";

export default function normalizeWordPressContent(rawItem, type = "page") {
  const slug = rawItem.slug ?? String(rawItem.id);
  const title = rawItem.title?.rendered ?? rawItem.title ?? slug;
  const embeddedMedia = rawItem._embedded?.["wp:featuredmedia"]?.[0] ?? null;
  const embeddedAuthor = rawItem._embedded?.author?.[0] ?? null;

  return {
    id: `${type}-${rawItem.id}`,
    type,
    title: stripTags(title),
    slug,
    status: rawItem.status ?? null,
    domain: "wordpress",
    data: toJsonData({
      acf: rawItem.acf ?? {},
      author: embeddedAuthor ? normalizeWordPressAuthor(embeddedAuthor) : normalizeAuthorReference(rawItem.author),
      authorId: embeddedAuthor?.id ?? rawItem.author ?? null,
      excerpt: stripTags(rawItem.excerpt?.rendered ?? ""),
      featuredImage: embeddedMedia ? normalizeWordPressMedia(embeddedMedia) : null,
      terms: normalizeTerms(rawItem),
      content: rawItem.content?.rendered ?? "",
      date: rawItem.date ?? null,
      link: rawItem.link ?? null,
      modified: rawItem.modified ?? null,
      rawType: rawItem.type ?? type
    }),
    seo: normalizeRankMathSeo(rawItem)
  };
}

function normalizeAuthorReference(authorId) {
  if (authorId === null || authorId === undefined) return null;

  return {
    avatarUrl: null,
    description: "",
    id: String(authorId),
    name: "",
    slug: String(authorId),
    url: null
  };
}

function stripTags(value) {
  return String(value).replace(/<[^>]*>/g, "").trim();
}

function normalizeTerms(rawItem) {
  const embeddedTerms = rawItem._embedded?.["wp:term"] ?? [];

  return embeddedTerms.flat().map((term) => ({
    id: term.id,
    name: term.name,
    slug: term.slug,
    taxonomy: term.taxonomy
  }));
}
