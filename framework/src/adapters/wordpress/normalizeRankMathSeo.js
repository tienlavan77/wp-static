export default function normalizeRankMathSeo(rawItem = {}) {
  const meta = rawItem.meta ?? {};

  return removeEmpty({
    title: first(meta.rank_math_title, rawItem.rank_math_title),
    description: first(meta.rank_math_description, rawItem.rank_math_description),
    canonical: first(meta.rank_math_canonical_url, rawItem.rank_math_canonical_url),
    robots: normalizeRobots(first(meta.rank_math_robots, rawItem.rank_math_robots)),
    focusKeyword: first(meta.rank_math_focus_keyword, rawItem.rank_math_focus_keyword),
    openGraph: removeEmpty({
      title: first(meta.rank_math_facebook_title, rawItem.rank_math_facebook_title),
      description: first(meta.rank_math_facebook_description, rawItem.rank_math_facebook_description),
      image: first(meta.rank_math_facebook_image, rawItem.rank_math_facebook_image)
    }),
    twitter: removeEmpty({
      title: first(meta.rank_math_twitter_title, rawItem.rank_math_twitter_title),
      description: first(meta.rank_math_twitter_description, rawItem.rank_math_twitter_description),
      image: first(meta.rank_math_twitter_image, rawItem.rank_math_twitter_image)
    })
  });
}

function first(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== "");
}

function normalizeRobots(value) {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    return value.split(",").map((item) => item.trim()).filter(Boolean);
  }

  return undefined;
}

function removeEmpty(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => {
      if (item === undefined || item === null || item === "") {
        return false;
      }

      if (Array.isArray(item)) {
        return item.length > 0;
      }

      if (typeof item === "object") {
        return Object.keys(item).length > 0;
      }

      return true;
    })
  );
}
