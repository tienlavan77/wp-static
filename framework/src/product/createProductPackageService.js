import { createHash } from "node:crypto";
import { cp, mkdir, readFile, readdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import deepFreeze from "../shared/deepFreeze.js";
import createProductManifest from "./createProductManifest.js";

export const PRODUCT_PACKAGE_SCHEMA = "wpsc.product-package";
export const PRODUCT_PACKAGE_VERSION = 1;

export default function createProductPackageService(options = {}) {
  const workspaceDir = path.resolve(options.workspaceDir ?? process.cwd());
  const now = typeof options.now === "function" ? options.now : () => new Date().toISOString();

  async function create(input = {}) {
    const product = input.product ?? createProductManifest({ version: input.version ?? "1.0.0" });
    const packageId = safePackageId(input.packageId ?? `${product.productId}-${product.version}`);
    const sourceDir = path.resolve(input.sourceDir ?? workspaceDir);
    const target = packagePath(packageId);
    const includes = input.includes ?? ["framework", "package.json"];
    try {
      await assertAbsent(path.join(target, "product-package.json"));
      await mkdir(target, { recursive: true });
      for (const include of includes) await copyIncluded(sourceDir, target, include);
      const manifest = await fileManifest(target);
      const artifact = deepFreeze({
        createdAt: now(),
        files: manifest.files,
        integrity: manifest.integrity,
        packageId,
        product,
        runtimeCompatibility: product.compatibility,
        schema: PRODUCT_PACKAGE_SCHEMA,
        schemaVersion: PRODUCT_PACKAGE_VERSION
      });
      await writeJson(path.join(target, "product-package.json"), artifact);
      return success({ artifact, path: target });
    } catch (error) { return failure("product.package.create.failed", error.message); }
  }

  async function verify(packageId) {
    try {
      const target = packagePath(packageId);
      const artifact = JSON.parse(await readFile(path.join(target, "product-package.json"), "utf8"));
      if (artifact.schema !== PRODUCT_PACKAGE_SCHEMA || artifact.schemaVersion !== PRODUCT_PACKAGE_VERSION) return failure("product.package.schema.invalid", "Product package contract is unsupported.");
      const manifest = await fileManifest(target, new Set(["product-package.json"]));
      if (manifest.integrity.checksum !== artifact.integrity?.checksum) return failure("product.package.integrity.invalid", "Product package integrity verification failed.");
      return success({ artifact: deepFreeze(artifact), verified: true });
    } catch (error) { return failure(error.code === "ENOENT" ? "product.package.not_found" : "product.package.verify.failed", error.code === "ENOENT" ? "Product package was not found." : error.message); }
  }

  function packagePath(packageId) { return path.join(workspaceDir, "storage", "product-packages", safePackageId(packageId)); }
  return Object.freeze({ create, verify });
}

async function copyIncluded(source, target, relative) { const safe = String(relative).replace(/^[/\\]+/, ""); if (safe.includes("..")) throw new TypeError("Product package include path is unsafe."); await cp(path.join(source, safe), path.join(target, safe), { errorOnExist: true, force: false, recursive: true }); }
async function fileManifest(root, ignored = new Set()) { const files = await walk(root, "", ignored); return { files, integrity: { algorithm: "sha256", checksum: hash(JSON.stringify(files)) } }; }
async function walk(root, relative, ignored) { const entries = await readdir(path.join(root, relative), { withFileTypes: true }); const files = []; for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) { const child = path.join(relative, entry.name); if (ignored.has(child.split(path.sep).join("/"))) continue; if (entry.isDirectory()) files.push(...await walk(root, child, ignored)); else if (entry.isFile()) { const value = await readFile(path.join(root, child)); files.push({ path: child.split(path.sep).join("/"), sha256: hash(value), size: value.length }); } } return files; }
async function writeJson(target, value) { await mkdir(path.dirname(target), { recursive: true }); const temporary = `${target}.tmp`; await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8"); await rename(temporary, target); }
async function assertAbsent(target) { try { await readFile(target); throw new Error("Product package already exists and is immutable."); } catch (error) { if (error.code === "ENOENT") return; throw error; } }
function safePackageId(value) { const id = String(value ?? ""); if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(id)) throw new TypeError("Product package id is invalid."); return id; }
function hash(value) { return createHash("sha256").update(value).digest("hex"); }
function success(data) { return deepFreeze({ diagnostics: { errors: [], warnings: [] }, ok: true, schema: PRODUCT_PACKAGE_SCHEMA, schemaVersion: PRODUCT_PACKAGE_VERSION, ...data }); }
function failure(code, message) { return deepFreeze({ diagnostics: { errors: [{ code, message, severity: "error" }], warnings: [] }, ok: false, schema: PRODUCT_PACKAGE_SCHEMA, schemaVersion: PRODUCT_PACKAGE_VERSION }); }
