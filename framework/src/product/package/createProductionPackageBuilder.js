import { createHash } from "node:crypto";
import { cp, lstat, mkdir, readFile, readdir, readlink, rename, rm, stat, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import createProductManifest from "../createProductManifest.js";
import { dependencyEvidenceFiles } from "./createProductionDependencyEvidence.js";

const forbidden = ["sites/", "storage/", "public/", ".git/", "test/", "tests/", "tmp/", "output/", "outputs/", ".env"];

export default function createProductionPackageBuilder(options = {}) {
  const now = options.now ?? (() => new Date().toISOString());
  const sign = options.sign ?? null;
  async function build(input = {}) {
    const source = path.resolve(input.sourceDir);
    const target = path.resolve(input.targetDir);
    const staging = `${target}.building`;
    const product = input.product ?? createProductManifest({ version: input.version });
    const files = dependencyEvidenceFiles(input.evidence);
    if (await stat(target).then(() => true, () => false)) throw new Error("Production package target already exists and is immutable.");
    await rm(staging, { force: true, recursive: true });
    await mkdir(staging, { recursive: true });
    try {
      for (const relative of files) { assertProductionPath(relative); await copyEntry(source, staging, relative); }
      await writeJson(path.join(staging, "production-dependencies.json"), input.evidence);
      const tree = await deterministicTree(staging);
      const signingInput = Buffer.from(`${JSON.stringify({ product, tree })}\n`, "utf8");
      const signature = sign ? await sign(signingInput) : null;
      const manifest = { createdAt: now(), dependencies: "production-dependencies.json", files: tree, integrity: { algorithm: "sha256", checksum: sha256(signingInput) }, product, schema: "wpsc.production-package", schemaVersion: 1, signature };
      await writeJson(path.join(staging, "production-package.json"), manifest);
      await rename(staging, target);
      return Object.freeze({ manifest: Object.freeze(manifest), ok: true, path: target, signingInput });
    } catch (error) { await rm(staging, { force: true, recursive: true }); throw error; }
  }
  return Object.freeze({ build });
}

export async function deterministicTree(root, ignored = new Set(["production-package.json"])) {
  const entries = [];
  await walk(path.resolve(root), "", entries, ignored);
  return entries;
}

async function walk(root, relative, entries, ignored) {
  for (const name of (await readdir(path.join(root, relative))).sort()) {
    const child = path.posix.join(relative.split(path.sep).join("/"), name);
    if (ignored.has(child)) continue;
    const absolute = path.join(root, child);
    const metadata = await lstat(absolute);
    if (metadata.isDirectory()) { entries.push({ path: child, type: "directory" }); await walk(root, child, entries, ignored); }
    else if (metadata.isFile()) { const bytes = await readFile(absolute); entries.push({ path: child, sha256: sha256(bytes), size: bytes.length, type: "file" }); }
    else if (metadata.isSymbolicLink()) { const target = await readlink(absolute); assertSafeSymlink(child, target); entries.push({ path: child, target, type: "symlink" }); }
    else throw new TypeError(`Production package contains unsupported file type: ${child}.`);
  }
  return entries;
}

async function copyEntry(source, target, relative) {
  const from = path.join(source, relative);
  const metadata = await lstat(from);
  await mkdir(path.dirname(path.join(target, relative)), { recursive: true });
  if (metadata.isSymbolicLink()) { const link = await readlink(from); assertSafeSymlink(relative, link); await symlink(link, path.join(target, relative)); return; }
  if (!metadata.isFile()) throw new TypeError(`Production package evidence must name individual files: ${relative}.`);
  await cp(from, path.join(target, relative));
}
function assertProductionPath(relative) { if (forbidden.some((prefix) => relative === prefix.replace(/\/$/, "") || relative.startsWith(prefix))) throw new TypeError(`Development or mutable material cannot enter a production package: ${relative}.`); }
function assertSafeSymlink(relative, target) { const root = relative.split("/")[0]; const resolved = new URL(target, `file:///${relative}`).pathname; if (target.startsWith("/") || !resolved.startsWith(`/${root}/`)) throw new TypeError(`Production package symlink escapes its root: ${relative}.`); }
function sha256(value) { return createHash("sha256").update(value).digest("hex"); }
async function writeJson(file, value) { await mkdir(path.dirname(file), { recursive: true }); await writeFile(file, `${JSON.stringify(value, null, 2)}\n`, "utf8"); }
