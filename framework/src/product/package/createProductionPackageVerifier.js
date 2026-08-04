import { createHash, verify as verifySignature } from "node:crypto";
import { cp, lstat, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { validateProductCompatibility } from "../createProductManifest.js";
import { deterministicTree } from "./createProductionPackageBuilder.js";

const transportFiles = new Set(["production-package.json", ".wpsc-acquisition.json"]);

export default function createProductionPackageVerifier(options = {}) {
  const expected = { architectureVersion: options.architectureVersion, productId: options.productId ?? "wpsc", runtimeVersion: options.runtimeVersion, nodeVersion: options.nodeVersion };
  const copyFile = options.copyFile ?? cp;
  async function verifyPackage(input = {}) {
    try {
      const packageDir = path.resolve(input.packageDir);
      const manifest = JSON.parse(await readFile(path.join(packageDir, "production-package.json"), "utf8"));
      validateManifest(manifest);
      const tree = await deterministicTree(packageDir, transportFiles);
      if (JSON.stringify(tree) !== JSON.stringify(manifest.files)) return reject("product.package.tree.invalid", "Production package tree does not match its manifest.");
      const signingInput = signingBytes(manifest);
      if (sha256(signingInput) !== manifest.integrity?.checksum) return reject("product.package.checksum.invalid", "Production package signing checksum is invalid.");
      if (!verifySignature(null, signingInput, input.publicKey, Buffer.from(String(manifest.signature ?? ""), "base64"))) return reject("product.package.signature.invalid", "Production package signature is invalid.");
      const compatibility = validateProductCompatibility(manifest.product, expected);
      if (!compatibility.ok) return reject("product.package.compatibility.invalid", compatibility.errors[0].message);
      return Object.freeze({ accepted: true, diagnostics: { errors: [], warnings: [] }, manifest, ok: true, signingInput });
    } catch (error) { return reject(error.code === "ENOENT" ? "product.package.not_found" : "product.package.manifest.invalid", error.message); }
  }
  async function extract(input = {}) {
    const verified = input.verified ?? await verifyPackage(input);
    if (!verified.accepted) return verified;
    const source = path.resolve(input.packageDir);
    const target = path.resolve(input.targetDir);
    const staging = `${target}.extracting`;
    await rm(staging, { force: true, recursive: true });
    await mkdir(staging, { recursive: true });
    try {
      for (const entry of verified.manifest.files) {
        if (entry.type === "directory") await mkdir(path.join(staging, entry.path), { recursive: true });
        else if (entry.type === "file") { await mkdir(path.dirname(path.join(staging, entry.path)), { recursive: true }); await copyFile(path.join(source, entry.path), path.join(staging, entry.path)); }
        else if (entry.type === "symlink") { await mkdir(path.dirname(path.join(staging, entry.path)), { recursive: true }); await symlinkSafe(staging, entry.path, entry.target); }
        else throw new TypeError(`Unsupported production package entry type: ${entry.type}.`);
      }
      await writeFile(path.join(staging, "production-package.json"), `${JSON.stringify(verified.manifest, null, 2)}\n`, "utf8");
      const tree = await deterministicTree(staging, transportFiles);
      if (JSON.stringify(tree) !== JSON.stringify(verified.manifest.files)) throw new Error("Extracted production package tree does not match manifest.");
      if (await exists(target)) throw new Error("Production extraction target already exists.");
      await rename(staging, target);
      return Object.freeze({ extracted: true, manifest: verified.manifest, ok: true, path: target });
    } catch (error) { await rm(staging, { force: true, recursive: true }); return reject("product.package.extraction.failed", error.message); }
  }
  return Object.freeze({ extract, verifyPackage });
}

function validateManifest(manifest) {
  if (manifest.schema !== "wpsc.production-package" || manifest.schemaVersion !== 1 || !manifest.product || !Array.isArray(manifest.files)) throw new TypeError("Production package manifest is malformed.");
  for (const entry of manifest.files) {
    const relative = String(entry.path ?? "");
    if (!relative || relative.startsWith("/") || relative.includes("\\") || relative.split("/").includes("..")) throw new TypeError(`Production package path is unauthorized: ${relative}.`);
    if (!["directory", "file", "symlink"].includes(entry.type)) throw new TypeError(`Production package entry type is unauthorized: ${entry.type}.`);
    if (entry.type === "file" && (!/^\d+$/.test(String(entry.size)) || !/^[a-f0-9]{64}$/.test(String(entry.sha256)))) throw new TypeError(`Production package file integrity is malformed: ${relative}.`);
    if (entry.type === "symlink") {
      const target = String(entry.target ?? "");
      const resolved = new URL(target, `file:///${relative}`).pathname;
      if (!target || target.startsWith("/") || !resolved.startsWith(`/${relative.split("/")[0]}/`)) throw new TypeError(`Production package symlink is unsafe: ${relative}.`);
    }
  }
}
async function symlinkSafe(root, relative, target) { const resolved = new URL(target, `file:///${relative}`).pathname; const packageRoot = `/${relative.split("/")[0]}/`; if (!resolved.startsWith(packageRoot)) throw new TypeError(`Production package symlink escapes root: ${relative}.`); const { symlink } = await import("node:fs/promises"); await symlink(target, path.join(root, relative)); }
async function exists(file) { return lstat(file).then(() => true, () => false); }
function signingBytes(manifest) { return Buffer.from(`${JSON.stringify({ product: manifest.product, tree: manifest.files })}\n`, "utf8"); }
function sha256(value) { return createHash("sha256").update(value).digest("hex"); }
function reject(code, message) { return Object.freeze({ accepted: false, diagnostics: { errors: [{ code, message, severity: "error" }], warnings: [] }, ok: false }); }
