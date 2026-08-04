import assert from "node:assert/strict";
import { createHash, generateKeyPairSync, sign } from "node:crypto";
import { lstat, mkdir, mkdtemp, readFile, readdir, readlink, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import createProductionPackageAcquisitionService from "../framework/src/product/installer/createProductionPackageAcquisitionService.js";
import createProductionDependencyEvidence from "../framework/src/product/package/createProductionDependencyEvidence.js";
import createProductionPackageBuilder from "../framework/src/product/package/createProductionPackageBuilder.js";
import createProductionPackageVerifier from "../framework/src/product/package/createProductionPackageVerifier.js";

function bundle(input = {}) {
  return Buffer.from(JSON.stringify({
    entries: [
      { content: Buffer.from('{"schema":"wpsc.production-package"}\n').toString("base64"), path: "production-package.json", type: "file" },
      { path: "framework", type: "directory" },
      { content: Buffer.from("export default true;\n").toString("base64"), path: "framework/entry.mjs", type: "file" }
    ],
    productId: "wpsc",
    schema: "wpsc.production-package-bundle",
    schemaVersion: 1,
    version: "1.0.0",
    ...input
  }));
}
function metadata(bytes, root) { return { installationId: "production", productId: "wpsc", sha256: createHash("sha256").update(bytes).digest("hex"), size: bytes.length, targetDir: path.join(root, "storage", "installer", "packages", "1.0.0"), url: "https://releases.example.test/wpsc/1.0.0.json", version: "1.0.0" }; }

test("C047 acquires a trusted identified Production package atomically and idempotently", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "wpsc-c047-acquire-"));
  const bytes = bundle();
  let downloads = 0;
  const service = createProductionPackageAcquisitionService({ allowedHosts: ["releases.example.test"], download: async ({ idempotencyKey, url }) => { downloads += 1; assert.equal(idempotencyKey, "install-1:package-download"); return { bytes, url }; } });
  const input = { ...metadata(bytes, root), idempotencyKey: "install-1:package-download" };
  const first = await service.acquire(input);
  assert.equal(first.ok, true);
  assert.equal(first.changed, true);
  assert.match(await readFile(path.join(first.packageDir, "framework", "entry.mjs"), "utf8"), /true/);
  const second = await service.acquire(input);
  assert.equal(second.ok, true);
  assert.equal(second.preserved, true);
  assert.equal(downloads, 1);
});

test("C047 rejects untrusted redirects, checksum and identity mismatches without a partial package", async () => {
  for (const scenario of ["redirect", "checksum", "identity"]) {
    const root = await mkdtemp(path.join(os.tmpdir(), `wpsc-c047-acquire-${scenario}-`));
    const bytes = scenario === "identity" ? bundle({ version: "9.9.9" }) : bundle();
    const input = metadata(bytes, root);
    if (scenario === "checksum") input.sha256 = "0".repeat(64);
    const service = createProductionPackageAcquisitionService({ allowedHosts: ["releases.example.test"], download: async ({ url }) => ({ bytes, url: scenario === "redirect" ? "https://evil.example.test/package.json" : url }) });
    const result = await service.acquire(input);
    assert.equal(result.ok, false, scenario);
    await assert.rejects(stat(input.targetDir), { code: "ENOENT" });
    await assert.rejects(stat(`${input.targetDir}.downloading-production`), { code: "ENOENT" });
  }
});

test("C047 rejects unsafe package bundle paths before materialization", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "wpsc-c047-acquire-path-"));
  const bytes = bundle({ entries: [{ content: "eA==", path: "../escape", type: "file" }, { content: "e30=", path: "production-package.json", type: "file" }] });
  const input = metadata(bytes, root);
  const service = createProductionPackageAcquisitionService({ allowedHosts: ["releases.example.test"], download: async ({ url }) => ({ bytes, url }) });
  assert.equal((await service.acquire(input)).diagnostics.errors[0].code, "installation.package.path_unsafe");
  await assert.rejects(stat(path.join(root, "escape")), { code: "ENOENT" });
});

test("C047 hands the acquired artifact to the real C041 signature verifier", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "wpsc-c047-handoff-"));
  const source = path.join(root, "source");
  await mkdir(path.join(source, "framework"), { recursive: true });
  await writeFile(path.join(source, "framework", "entry.mjs"), "export default 'production';\n");
  const keys = generateKeyPairSync("ed25519");
  const built = path.join(root, "built");
  const evidence = createProductionDependencyEvidence({ features: { core: { entrypoints: ["framework/entry.mjs"] } }, modules: { "framework/entry.mjs": {} } });
  await createProductionPackageBuilder({ sign: async (content) => sign(null, content, keys.privateKey).toString("base64") }).build({ evidence, sourceDir: source, targetDir: built, version: "1.0.0" });
  const bytes = Buffer.from(JSON.stringify({ entries: await bundleEntries(built), productId: "wpsc", schema: "wpsc.production-package-bundle", schemaVersion: 1, version: "1.0.0" }));
  const input = metadata(bytes, root);
  const acquisition = createProductionPackageAcquisitionService({ allowedHosts: ["releases.example.test"], download: async ({ url }) => ({ bytes, url }) });
  const acquired = await acquisition.acquire(input);
  assert.equal(acquired.ok, true);
  const verified = await createProductionPackageVerifier({ architectureVersion: "2.02", nodeVersion: "26.3.1", runtimeVersion: "1.0" }).verifyPackage({ packageDir: acquired.packageDir, publicKey: keys.publicKey });
  assert.equal(verified.accepted, true);
  assert.equal(verified.manifest.product.version, "1.0.0");
});

async function bundleEntries(root, relative = "") {
  const entries = [];
  for (const name of (await readdir(path.join(root, relative))).sort()) {
    const child = path.posix.join(relative, name);
    const metadata = await lstat(path.join(root, child));
    if (metadata.isDirectory()) { entries.push({ path: child, type: "directory" }); entries.push(...await bundleEntries(root, child)); }
    else if (metadata.isFile()) entries.push({ content: (await readFile(path.join(root, child))).toString("base64"), path: child, type: "file" });
    else if (metadata.isSymbolicLink()) entries.push({ path: child, target: await readlink(path.join(root, child)), type: "symlink" });
  }
  return entries;
}
