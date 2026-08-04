import { createHash } from "node:crypto";
import { lstat, mkdir, open, readFile, readdir, readlink, rename, rm } from "node:fs/promises";
import path from "node:path";

export default function createProductionPackageBundle() {
  async function build(input = {}) {
    const packageDir = path.resolve(input.packageDir);
    const outputFile = path.resolve(input.outputFile);
    const manifest = JSON.parse(await readFile(path.join(packageDir, "production-package.json"), "utf8"));
    if (manifest.schema !== "wpsc.production-package" || manifest.schemaVersion !== 1 || !manifest.product?.version) throw new TypeError("A signed Production Package directory is required before transport bundling.");
    if (!manifest.signature) throw new TypeError("Production Package must be signed before transport bundling.");
    const entries = await collect(packageDir);
    const bundle = { entries, productId: manifest.product.productId ?? "wpsc", schema: "wpsc.production-package-bundle", schemaVersion: 1, version: manifest.product.version };
    const bytes = Buffer.from(`${JSON.stringify(bundle)}\n`, "utf8");
    if (await exists(outputFile)) throw new Error("Production Package transport bundle is immutable and already exists.");
    await atomicWrite(outputFile, bytes);
    return Object.freeze({ outputFile, productId: bundle.productId, sha256: createHash("sha256").update(bytes).digest("hex"), size: bytes.length, version: bundle.version });
  }
  return Object.freeze({ build });
}

async function collect(root, relative = "") {
  const entries = [];
  for (const name of (await readdir(path.join(root, relative))).sort()) {
    const child = path.posix.join(relative, name);
    if (child === ".wpsc-acquisition.json") continue;
    const absolute = path.join(root, child);
    const metadata = await lstat(absolute);
    if (metadata.isDirectory()) { entries.push({ path: child, type: "directory" }); entries.push(...await collect(root, child)); }
    else if (metadata.isFile()) entries.push({ content: (await readFile(absolute)).toString("base64"), path: child, type: "file" });
    else if (metadata.isSymbolicLink()) { const target = await readlink(absolute); assertSafeLink(child, target); entries.push({ path: child, target, type: "symlink" }); }
    else throw new TypeError(`Production Package transport contains an unsupported file type: ${child}.`);
  }
  return entries;
}
function assertSafeLink(relative, target) { const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(relative), target)); if (!target || target.startsWith("/") || resolved === ".." || resolved.startsWith("../")) throw new TypeError(`Production Package transport symlink escapes package root: ${relative}.`); }
async function atomicWrite(target, bytes) { await mkdir(path.dirname(target), { recursive: true }); const temporary = `${target}.${process.pid}.tmp`; await rm(temporary, { force: true }); const handle = await open(temporary, "wx", 0o644); try { await handle.writeFile(bytes); await handle.sync(); } finally { await handle.close(); } await rename(temporary, target); const directory = await open(path.dirname(target), "r"); try { await directory.sync(); } finally { await directory.close(); } }
async function exists(target) { return lstat(target).then(() => true, () => false); }
