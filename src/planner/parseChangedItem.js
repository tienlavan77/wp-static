const TYPE_ALIASES = {
  category: "term",
  page: "page",
  post: "post",
  post_tag: "term",
  product: "product",
  product_cat: "term",
  product_tag: "term",
  tag: "term",
  term: "term"
};

export default function parseChangedItem(input) {
  if (typeof input !== "string" || input.trim() === "") {
    throw new Error('Changed item must use "type:id" or "term:taxonomy:slug".');
  }

  const parts = input.trim().split(":").map((part) => part.trim()).filter(Boolean);
  const rawType = parts[0];
  const type = TYPE_ALIASES[rawType] ?? rawType;

  if (type === "term") {
    if (parts.length < 3) {
      throw new Error('Changed term must use "term:taxonomy:slug".');
    }

    return {
      id: parts[2],
      raw: input,
      routeSlug: normalizeSlug(parts[2]),
      taxonomy: parts[1],
      type
    };
  }

  if (parts.length < 2) {
    throw new Error('Changed item must use "type:id".');
  }

  return {
    id: parts[1],
    raw: input,
    routeSlug: normalizeSlug(parts[1]),
    taxonomy: null,
    type
  };
}

function normalizeSlug(value) {
  return String(value ?? "")
    .trim()
    .replace(/^\/+|\/+$/g, "");
}
