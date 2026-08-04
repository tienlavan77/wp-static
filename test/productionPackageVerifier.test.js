import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import { cp, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createProductionDependencyEvidence, createProductionPackageBuilder, createProductionPackageVerifier } from "../framework/src/index.js";

test("C041 verifies a signed production package and atomically extracts its exact tree", async () => {
  const source = await fixtureSource();
  const root = await mkdtemp(path.join(os.tmpdir(), "wpsc-c041-valid-"));
  const keys = generateKeyPairSync("ed25519");
  const builder = createProductionPackageBuilder({ sign: async (content) => sign(null, content, keys.privateKey).toString("base64") });
  const packageDir = path.join(root, "package");
  await builder.build({ evidence: evidence(), sourceDir: source, targetDir: packageDir, version: "1.0.0" });
  const verifier = createProductionPackageVerifier({ architectureVersion: "2.02", nodeVersion: "26.3.1", runtimeVersion: "1.0" });
  const verified = await verifier.verifyPackage({ packageDir, publicKey: keys.publicKey });
  assert.equal(verified.accepted, true);
  const extracted = await verifier.extract({ packageDir, publicKey: keys.publicKey, targetDir: path.join(root, "runtime") });
  assert.equal(extracted.extracted, true);
  assert.equal(await readFile(path.join(root, "runtime", "framework", "entry.mjs"), "utf8"), "export default 'runtime';\n");
});

test("C041 rejects malformed, unauthorized and checksum-tampered manifests", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "wpsc-c041-malformed-"));
  const packageDir = path.join(root, "package");
  await mkdir(packageDir);
  const verifier = createProductionPackageVerifier({});
  await writeFile(path.join(packageDir, "production-package.json"), JSON.stringify({ schema: "wpsc.production-package", schemaVersion: 1, files: [{ path: "../escape", type: "file" }] }));
  const result = await verifier.verifyPackage({ packageDir, publicKey: "bad" });
  assert.equal(result.diagnostics.errors[0].code, "product.package.manifest.invalid");
  const source = await fixtureSource();
  const keys = generateKeyPairSync("ed25519");
  const built = path.join(root, "built");
  await createProductionPackageBuilder({ sign: async (content) => sign(null, content, keys.privateKey).toString("base64") }).build({ evidence: evidence(), sourceDir: source, targetDir: built, version: "1.0.0" });
  const manifestFile = path.join(built, "production-package.json");
  const manifest = JSON.parse(await readFile(manifestFile, "utf8"));
  manifest.files[0].path = "../escape";
  await writeFile(manifestFile, JSON.stringify(manifest));
  assert.equal((await verifier.verifyPackage({ packageDir: built, publicKey: keys.publicKey })).accepted, false);
});

test("C041 rejects checksum, wrong key and incompatible Product/Architecture/Runtime", async () => {
  const source = await fixtureSource();
  const root = await mkdtemp(path.join(os.tmpdir(), "wpsc-c041-compat-"));
  const keys = generateKeyPairSync("ed25519");
  const packageDir = path.join(root, "package");
  await createProductionPackageBuilder({ sign: async (content) => sign(null, content, keys.privateKey).toString("base64") }).build({ evidence: evidence(), sourceDir: source, targetDir: packageDir, version: "1.0.0" });
  await writeFile(path.join(packageDir, "framework", "entry.mjs"), "tampered\n");
  const verifier = createProductionPackageVerifier({ architectureVersion: "9.0.0", nodeVersion: "18.0.0", runtimeVersion: "9.0" });
  assert.equal((await verifier.verifyPackage({ packageDir, publicKey: keys.publicKey })).accepted, false);
  const fresh = path.join(root, "fresh");
  await createProductionPackageBuilder({ sign: async (content) => sign(null, content, keys.privateKey).toString("base64") }).build({ evidence: evidence(), sourceDir: source, targetDir: fresh, version: "1.0.0" });
  assert.equal((await verifier.verifyPackage({ packageDir: fresh, publicKey: keys.publicKey })).diagnostics.errors[0].code, "product.package.compatibility.invalid");
  assert.equal((await verifier.verifyPackage({ packageDir: fresh, publicKey: generateKeyPairSync("ed25519").publicKey })).accepted, false);
  const unsignedManifest = JSON.parse(await readFile(path.join(fresh, "production-package.json"), "utf8"));
  unsignedManifest.signature = null;
  await writeFile(path.join(fresh, "production-package.json"), JSON.stringify(unsignedManifest));
  assert.equal((await verifier.verifyPackage({ packageDir: fresh, publicKey: keys.publicKey })).accepted, false);
});

test("C041 rejects a post-extraction tree mismatch before publish", async () => {
  const source = await fixtureSource();
  const root = await mkdtemp(path.join(os.tmpdir(), "wpsc-c041-post-tree-"));
  const keys = generateKeyPairSync("ed25519");
  const packageDir = path.join(root, "package");
  await createProductionPackageBuilder({ sign: async (content) => sign(null, content, keys.privateKey).toString("base64") }).build({ evidence: evidence(), sourceDir: source, targetDir: packageDir, version: "1.0.0" });
  const target = path.join(root, "runtime");
  let copies = 0;
  const verifier = createProductionPackageVerifier({ copyFile: async (sourceFile, targetFile) => { copies += 1; await cp(sourceFile, targetFile); if (copies === 2) await writeFile(targetFile, "post-copy tamper\n"); } });
  const result = await verifier.extract({ packageDir, publicKey: keys.publicKey, targetDir: target });
  assert.equal(result.diagnostics.errors[0].code, "product.package.extraction.failed");
  assert.match(result.diagnostics.errors[0].message, /tree does not match/);
  await assert.rejects(() => readFile(target));
});

test("C041 failed extraction leaves no usable target or staging directory", async () => {
  const source = await fixtureSource();
  const root = await mkdtemp(path.join(os.tmpdir(), "wpsc-c041-failure-"));
  const keys = generateKeyPairSync("ed25519");
  const packageDir = path.join(root, "package");
  await createProductionPackageBuilder({ sign: async (content) => sign(null, content, keys.privateKey).toString("base64") }).build({ evidence: evidence(), sourceDir: source, targetDir: packageDir, version: "1.0.0" });
  const target = path.join(root, "runtime");
  let copies = 0;
  const verifier = createProductionPackageVerifier({ copyFile: async (sourceFile, targetFile) => { copies += 1; if (copies === 2) throw new Error("simulated interrupted extraction"); await cp(sourceFile, targetFile); } });
  const result = await verifier.extract({ packageDir, publicKey: keys.publicKey, targetDir: target });
  assert.equal(result.ok, false);
  assert.match(result.diagnostics.errors[0].message, /interrupted extraction/);
  await assert.rejects(() => readFile(target));
  await assert.rejects(() => readFile(`${target}.extracting`));
});

function evidence() { return createProductionDependencyEvidence({ features: { core: { entrypoints: ["framework/entry.mjs"] } }, modules: { "framework/entry.mjs": {} } }); }
async function fixtureSource() { const root = await mkdtemp(path.join(os.tmpdir(), "wpsc-c041-source-")); await mkdir(path.join(root, "framework"), { recursive: true }); await writeFile(path.join(root, "framework", "entry.mjs"), "export default 'runtime';\n"); return root; }
