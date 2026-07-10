export default function extractMainFragment(html) {
  const openMatch = html.match(/<main\b[^>]*>/i);

  if (!openMatch || openMatch.index === undefined) {
    return "";
  }

  const start = openMatch.index;
  let cursor = start + openMatch[0].length;
  let depth = 1;
  const tagPattern = /<\/?main\b[^>]*>/gi;
  tagPattern.lastIndex = cursor;

  for (let match = tagPattern.exec(html); match; match = tagPattern.exec(html)) {
    if (match[0].startsWith("</")) {
      depth -= 1;
    } else {
      depth += 1;
    }

    if (depth === 0) {
      return html.slice(start, match.index + match[0].length);
    }

    cursor = tagPattern.lastIndex;
  }

  return html.slice(start, cursor);
}
