import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import createProductionPackageVerifier from "../product/package/createProductionPackageVerifier.js";
import createReleaseArtifactPublisher from "../product/createReleaseArtifactPublisher.js";
import { validateReleaseOperationsConfiguration } from "../product/createReleaseOperationsConfiguration.js";

export default function createProductReleaseOperationsCommand(options = {}) {
  const read = options.readFile ?? readFile;
  const metadata = options.stat ?? stat;

  async function run(input = {}) {
    try {
      requireValue(input.packageDir, "--package-dir", "release_operations.package_dir.required");
      if (input.operation === "publish") {
        requireValue(input.configPath, "--config", "release_operations.config.required");
        requireValue(input.artifact, "--artifact", "release_operations.artifact.required");
        requireValue(input.channel, "--channel", "release_operations.channel.required");
      }
      const configuration = input.configPath ? validateReleaseOperationsConfiguration(JSON.parse(await read(path.resolve(input.configPath), "utf8")), { retiredHarness: options.retiredHarness }) : null;
      const channel = configuration?.channels[input.channel];
      if (input.operation === "publish" && !channel) return failed("release_operations.channel.not_found", "Release channel is not configured.");
      const publicKeyPath = input.publicKeyPath ?? configuration?.signing.publicKeyPath;
      if (!publicKeyPath) return failed("release_operations.public_key.required", "A C041 public key is required.");
      const publicKey = await read(publicKeyPath, "utf8");
      const verifier = options.verifier ?? createProductionPackageVerifier(options.compatibility);
      const verified = await verifier.verifyPackage({ packageDir: path.resolve(input.packageDir), publicKey });
      if (!verified.accepted) return { code: 1, result: redacted(verified) };
      if (input.operation === "verify") return { code: 0, result: redacted({ accepted: true, manifest: { product: verified.manifest.product, schema: verified.manifest.schema, schemaVersion: verified.manifest.schemaVersion }, mutation: "NONE", ok: true, verification: "C041" }) };
      if (input.operation !== "publish") return failed("release_operations.command.invalid", "Product release operation is invalid.");
      if (!input.dryRun && !input.confirmed) return failed("CONFIRMATION_REQUIRED", "Publication requires --confirm.");
      const release = await transportIdentity(path.resolve(input.artifact), metadata, read);
      const product = verified.manifest.product;
      if (release.productId !== (product.productId ?? "wpsc") || release.version !== product.version) return failed("RELEASE_IDENTITY_CONFLICT", "Transport bundle identity does not match the C041-verified package.");
      if (!channel.publisher.root) return failed("release_operations.publisher.root", "The selected channel has no publication destination.");
      const publisher = options.publisher ?? createReleaseArtifactPublisher({ root: channel.publisher.root });
      const result = await publisher.publish({ artifact: path.resolve(input.artifact), channel: input.channel, dryRun: input.dryRun, release, verified });
      return { code: result.ok ? 0 : 1, result: redacted(result) };
    } catch (error) { return failed(error.code ?? "release_operations.failed", "Release operation failed. Inspect redacted diagnostics."); }
  }
  return Object.freeze({ run });
}

async function transportIdentity(file, metadata, read) { const info = await metadata(file); const bytes = await read(file); const bundle = JSON.parse(bytes.toString("utf8")); if (bundle.schema !== "wpsc.production-package-bundle" || bundle.schemaVersion !== 1 || bundle.productId !== "wpsc" || !/^\d+\.\d+\.\d+$/.test(String(bundle.version ?? ""))) throw coded("release_operations.bundle.invalid", "Transport bundle identity is invalid."); return { productId: bundle.productId, version: bundle.version, size: info.size, sha256: createHash("sha256").update(bytes).digest("hex") }; }
function redacted(value) { if (Array.isArray(value)) return value.map(redacted); if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).filter(([key]) => !/private.?key|credential|password|token|secret|signingInput/i.test(key)).map(([key, item]) => [key, redacted(item)])); return value; }
function failed(code, message) { return { code: 1, result: { code, diagnostics: { errors: [{ code, message, severity: "error" }], warnings: [] }, ok: false } }; }
function coded(code, message) { const error = new Error(message); error.code = code; return error; }
function requireValue(value, option, code) { if (!value || String(value).startsWith("--")) throw coded(code, `CLI option ${option} is required.`); }
