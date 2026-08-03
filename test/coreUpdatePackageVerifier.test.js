import assert from "node:assert/strict";
import { createHash, generateKeyPairSync, sign } from "node:crypto";
import test from "node:test";
import createCoreUpdatePackageVerifier from "../framework/src/product/update/createCoreUpdatePackageVerifier.js";

const content = Buffer.from("verified core package");
const keys = generateKeyPairSync("ed25519");
function pkg(overrides = {}) { return { content, manifest: { architecture: "2.02", checksum: createHash("sha256").update(content).digest("hex"), migration: "1", product: "wpsc", runtime: "1.0.0", signature: sign(null, content, keys.privateKey).toString("base64"), version: "1.1.0", ...overrides } }; }
function verifier(options = {}) { return createCoreUpdatePackageVerifier({ architecture: "2.02", compatibleMigration: (value) => value === "1", publicKey: keys.publicKey, runtime: "1.0.0", ...options }); }

test("Core Update Package Verifier accepts only a valid signed compatible package", async () => assert.equal((await verifier().verify(pkg())).accepted, true));

test("Core Update Package Verifier does not expose signing material in accepted data", async () => {
  const result = await verifier().verify(pkg());
  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes("privateKey"), false);
  assert.equal(serialized.includes("signatureKey"), false);
  assert.equal(serialized.includes(keys.privateKey.export({ format: "pem", type: "pkcs8" })), false);
});
for (const [name, input, code] of [
  ["checksum", { manifest: { ...pkg().manifest, checksum: "bad" } }, "core_update.package.checksum.invalid"],
  ["signature", { manifest: { ...pkg().manifest, signature: Buffer.from("invalid").toString("base64") } }, "core_update.package.signature.invalid"],
  ["product", { manifest: { ...pkg().manifest, product: "other" } }, "core_update.package.manifest.invalid"],
  ["architecture", { manifest: { ...pkg().manifest, architecture: "1.0" } }, "core_update.package.architecture.incompatible"],
  ["runtime", { manifest: { ...pkg().manifest, runtime: "2.0.0" } }, "core_update.package.runtime.incompatible"],
  ["migration", { manifest: { ...pkg().manifest, migration: "2" } }, "core_update.package.migration.incompatible"]
]) test(`Core Update Package Verifier rejects ${name} failure`, async () => { const result = await verifier().verify({ content, ...input }); assert.equal(result.diagnostics.errors[0].code, code); });
