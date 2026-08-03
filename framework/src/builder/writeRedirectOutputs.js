import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export default async function writeRedirectOutputs(redirects = [], options = {}) {
  const files = [];
  for (const redirect of redirects) {
    const slug = String(redirect.from || "").replace(/^\/+|\/+$/g, "");
    if (!slug || slug.includes("..")) continue;
    const relativePath = path.join(slug, "index.html");
    const target = path.join(options.outputDir, relativePath);
    await mkdir(path.dirname(target), { recursive: true });
    const destination = String(redirect.to).replace(/"/g, "%22");
    await writeFile(target, `<!doctype html><meta http-equiv="refresh" content="0;url=${destination}"><script>location.replace(${JSON.stringify(destination)})</script>`, "utf8");
    files.push(relativePath.replaceAll(path.sep, "/"));
  }
  return { files };
}
