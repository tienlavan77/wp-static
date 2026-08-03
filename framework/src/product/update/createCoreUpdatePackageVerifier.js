import { createHash, verify } from "node:crypto";
import deepFreeze from "../../shared/deepFreeze.js";

export default function createCoreUpdatePackageVerifier(options = {}) {
  const expected = { architecture: options.architecture, product: options.product ?? "wpsc", runtime: options.runtime };
  const verifySignature = options.verifySignature ?? ((content, signature) => verifyEd25519(content, signature, options.publicKey));
  const compatibleMigration = options.compatibleMigration ?? (() => true);
  return Object.freeze({ verify });

  async function verify(input = {}) {
    const manifest = input.manifest;
    const content = input.content;
    if (!manifest || !content || manifest.product !== expected.product || !validVersion(manifest.version)) return reject("core_update.package.manifest.invalid", "Package manifest is invalid.");
    if (hash(content) !== manifest.checksum) return reject("core_update.package.checksum.invalid", "Package checksum verification failed.");
    if (!await verifySignature(content, manifest.signature)) return reject("core_update.package.signature.invalid", "Package signature verification failed.");
    if (expected.architecture && manifest.architecture !== expected.architecture) return reject("core_update.package.architecture.incompatible", "Package Architecture is incompatible.");
    if (expected.runtime && manifest.runtime !== expected.runtime) return reject("core_update.package.runtime.incompatible", "Package Runtime is incompatible.");
    if (!compatibleMigration(manifest.migration ?? null)) return reject("core_update.package.migration.incompatible", "Package migration is incompatible.");
    return accept({ manifest: deepFreeze({ ...manifest }) });
  }
}

function hash(content) { return createHash("sha256").update(content).digest("hex"); }
function verifyEd25519(content, signature, publicKey) { if (!publicKey || !signature) return false; try { return verify(null, content, publicKey, Buffer.from(signature, "base64")); } catch { return false; } }
function validVersion(value) { return /^\d+\.\d+\.\d+$/.test(String(value ?? "")); }
function accept(data) { return deepFreeze({ diagnostics: { errors: [], warnings: [] }, accepted: true, ok: true, ...data }); }
function reject(code, message) { return deepFreeze({ accepted: false, diagnostics: { errors: [{ code, message, severity: "error" }], warnings: [] }, ok: false }); }
