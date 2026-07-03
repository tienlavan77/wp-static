import crypto from "node:crypto";
import path from "node:path";

export default function createAssetFilename(url) {
  const parsedUrl = new URL(url);
  const extension = path.extname(parsedUrl.pathname) || ".bin";
  const basename = path.basename(parsedUrl.pathname, extension)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "asset";
  const hash = crypto.createHash("sha1").update(url).digest("hex").slice(0, 10);

  return `${basename}-${hash}${extension.toLowerCase()}`;
}
