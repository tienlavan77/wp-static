const IMAGE_EXTENSIONS = /\.(avif|gif|jpe?g|png|svg|webp)(\?.*)?$/i;
const URL_PATTERN = /https?:\/\/[^\s"'<>\\)]+/g;

export default function collectAssetUrls(sitePlan) {
  const urls = new Set();

  for (const page of sitePlan.pages ?? []) {
    collectFromValue(page.html, urls);
    collectFromValue(page.route?.content?.data, urls);
    collectFromValue(page.route?.content?.seo, urls);
  }

  for (const media of sitePlan.graph?.media?.items ?? []) {
    collectFromValue(media.sourceUrl, urls);
  }

  return [...urls].filter(isImageUrl);
}

function collectFromValue(value, urls) {
  if (typeof value === "string") {
    for (const match of value.matchAll(URL_PATTERN)) {
      urls.add(match[0]);
    }

    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectFromValue(item, urls);
    }

    return;
  }

  if (value && typeof value === "object") {
    for (const item of Object.values(value)) {
      collectFromValue(item, urls);
    }
  }
}

function isImageUrl(url) {
  try {
    return IMAGE_EXTENSIONS.test(new URL(url).pathname);
  } catch {
    return false;
  }
}
