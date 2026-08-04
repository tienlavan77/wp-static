import { createHash } from "node:crypto";
import { lstat, readFile, readdir, readlink } from "node:fs/promises";
import path from "node:path";

export default async function createCorePackageContent(directory) {
  const root = path.resolve(directory);
  const entries = [];
  await walk(root, "", entries);
  return Buffer.from(`${JSON.stringify(entries)}\n`, "utf8");
}

async function walk(root, relative, entries) {
  const directory = path.join(root, relative);
  for (const name of (await readdir(directory)).sort()) {
    const child = path.join(relative, name);
    const absolute = path.join(root, child);
    const metadata = await lstat(absolute);
    if (metadata.isDirectory()) {
      entries.push({ path: portable(child), type: "directory" });
      await walk(root, child, entries);
    } else if (metadata.isSymbolicLink()) {
      entries.push({ path: portable(child), target: await readlink(absolute), type: "symlink" });
    } else if (metadata.isFile()) {
      entries.push({ path: portable(child), sha256: createHash("sha256").update(await readFile(absolute)).digest("hex"), type: "file" });
    }
  }
}

function portable(value) { return value.split(path.sep).join("/"); }
