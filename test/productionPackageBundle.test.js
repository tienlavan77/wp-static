import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import createProductionPackageAcquisitionService from "../framework/src/product/installer/createProductionPackageAcquisitionService.js";
import createProductionDependencyEvidence from "../framework/src/product/package/createProductionDependencyEvidence.js";
import createProductionPackageBuilder from "../framework/src/product/package/createProductionPackageBuilder.js";
import createProductionPackageBundle from "../framework/src/product/package/createProductionPackageBundle.js";
import createProductionPackageVerifier from "../framework/src/product/package/createProductionPackageVerifier.js";

test("C048 bundles a signed C040 package for acquisition and real C041 verification", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "wpsc-c048-bundle-"));
  const source = path.join(root, "source");
  await mkdir(path.join(source, "framework"), { recursive: true });
  await writeFile(path.join(source, "framework", "entry.mjs"), "export default 'production';\n");
  const keys = generateKeyPairSync("ed25519");
  const packageDir = path.join(root, "package");
  const evidence = createProductionDependencyEvidence({ features: { core: { entrypoints: ["framework/entry.mjs"] } }, modules: { "framework/entry.mjs": {} } });
  await createProductionPackageBuilder({ sign: async (content) => sign(null, content, keys.privateKey).toString("base64") }).build({ evidence, sourceDir: source, targetDir: packageDir, version: "1.0.0" });
  const outputFile = path.join(root, "release", "wpsc-1.0.0.bundle.json");
  const bundled = await createProductionPackageBundle().build({ outputFile, packageDir });
  assert.equal(bundled.version, "1.0.0");
  assert.match(bundled.sha256, /^[a-f0-9]{64}$/);
  assert.equal((await readFile(outputFile)).length, bundled.size);
  const acquisition = createProductionPackageAcquisitionService({ allowedHosts: ["releases.example.test"], download: async ({ url }) => ({ bytes: await readFile(outputFile), url }) });
  const acquired = await acquisition.acquire({ installationId: "production", productId: "wpsc", sha256: bundled.sha256, size: bundled.size, targetDir: path.join(root, "acquired"), url: "https://releases.example.test/wpsc-1.0.0.bundle.json", version: bundled.version });
  assert.equal(acquired.ok, true);
  const verified = await createProductionPackageVerifier({ architectureVersion: "2.02", nodeVersion: "26.3.1", runtimeVersion: "1.0" }).verifyPackage({ packageDir: acquired.packageDir, publicKey: keys.publicKey });
  assert.equal(verified.accepted, true);
});

test("C048 transport bundler rejects unsigned packages and immutable output replacement", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "wpsc-c048-bundle-invalid-"));
  const packageDir = path.join(root, "package");
  await mkdir(packageDir);
  await writeFile(path.join(packageDir, "production-package.json"), JSON.stringify({ product: { version: "1.0.0" }, schema: "wpsc.production-package", schemaVersion: 1, signature: null }));
  const outputFile = path.join(root, "bundle.json");
  await assert.rejects(createProductionPackageBundle().build({ outputFile, packageDir }), /must be signed/);
  await writeFile(path.join(packageDir, "production-package.json"), JSON.stringify({ product: { productId: "wpsc", version: "1.0.0" }, schema: "wpsc.production-package", schemaVersion: 1, signature: "signed" }));
  await createProductionPackageBundle().build({ outputFile, packageDir });
  await assert.rejects(createProductionPackageBundle().build({ outputFile, packageDir }), /immutable/);
});
