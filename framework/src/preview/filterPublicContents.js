const PUBLIC_STATUSES = new Set(["publish", "published", "public"]);

export default function filterPublicContents(contents, options = {}) {
  if (options.preview === true) {
    return contents;
  }

  return contents.filter((content) => {
    if (!content.status) {
      return true;
    }

    return PUBLIC_STATUSES.has(content.status);
  });
}
