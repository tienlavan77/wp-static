export default function normalizeWordPressContent(rawItem, type = "page") {
  const slug = rawItem.slug ?? String(rawItem.id);
  const title = rawItem.title?.rendered ?? rawItem.title ?? slug;

  return {
    id: `${type}-${rawItem.id}`,
    type,
    title: stripTags(title),
    slug,
    domain: "wordpress",
    data: {
      excerpt: stripTags(rawItem.excerpt?.rendered ?? ""),
      content: rawItem.content?.rendered ?? "",
      date: rawItem.date ?? null,
      link: rawItem.link ?? null
    }
  };
}

function stripTags(value) {
  return String(value).replace(/<[^>]*>/g, "").trim();
}
