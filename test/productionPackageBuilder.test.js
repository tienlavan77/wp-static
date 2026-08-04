import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPairSync, sign, verify } from "node:crypto";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { createProductionDependencyEvidence, createProductionPackageBuilder } from "../framework/src/index.js";

test("C040 emits machine-readable dependency evidence including dynamic and non-code dependencies", () => {
  const evidence = fixtureEvidence();
  assert.deepEqual(evidence.features.woocommerce.dynamicDependencies, ["framework/dynamic.mjs"]);
  assert.deepEqual(evidence.features.woocommerce.assets, ["assets/storefront.css"]);
  assert.deepEqual(evidence.features.woocommerce.templates, ["templates/product.html"]);
  assert.deepEqual(evidence.features.woocommerce.plugins, ["plugins/commerce/plugin.mjs"]);
  assert.ok(evidence.features.woocommerce.modules.includes("framework/runtime.mjs"));
});

test("C040 rejects an unresolved dependency instead of excluding it", () => {
  assert.throws(() => createProductionDependencyEvidence({ features: { commerce: { entrypoints: ["framework/entry.mjs"] } }, modules: { "framework/entry.mjs": { dynamicImports: ["framework/missing.mjs"] } } }), /missing module/);
});

test("C040 builds a deterministic signed production package and excludes development state", async () => {
  const source = await fixtureSource();
  const root = await mkdtemp(path.join(os.tmpdir(), "wpsc-c040-package-"));
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const builder = createProductionPackageBuilder({ now: () => "2026-08-04T00:00:00.000Z", sign: async (content) => sign(null, content, privateKey).toString("base64") });
  const first = await builder.build({ evidence: fixtureEvidence(), sourceDir: source, targetDir: path.join(root, "first"), version: "1.0.0" });
  const second = await builder.build({ evidence: fixtureEvidence(), sourceDir: source, targetDir: path.join(root, "second"), version: "1.0.0" });
  assert.deepEqual(first.manifest.files, second.manifest.files);
  assert.equal(first.manifest.integrity.checksum, second.manifest.integrity.checksum);
  assert.equal(verify(null, first.signingInput, publicKey, Buffer.from(first.manifest.signature, "base64")), true);
  const paths = first.manifest.files.map((entry) => entry.path);
  assert.equal(paths.some((entry) => /^(sites|storage|public|test|tmp|output)\//.test(entry)), false);
  assert.equal(JSON.stringify(first.manifest).includes("fixture-secret-value"), false);
  assert.ok(first.manifest.files.every((entry) => entry.type !== "file" || (Number.isInteger(entry.size) && /^[a-f0-9]{64}$/.test(entry.sha256))));
});

test("C040 selected feature boots without the development repository", async () => {
  const source = await fixtureSource();
  const target = path.join(await mkdtemp(path.join(os.tmpdir(), "wpsc-c040-boot-")), "package");
  await createProductionPackageBuilder({ now: () => "2026-08-04T00:00:00.000Z" }).build({ evidence: fixtureEvidence(), sourceDir: source, targetDir: target, version: "1.0.0" });
  const runtime = await import(`${pathToFileURL(path.join(target, "framework", "entry.mjs")).href}?isolated=1`);
  assert.equal(await runtime.bootCommerce(), "woocommerce:dynamic");
  assert.equal(await readFile(path.join(target, "assets", "storefront.css"), "utf8"), ".shop{}\n");
});

test("C040 production package targets are immutable", async () => {
  const source = await fixtureSource();
  const target = path.join(await mkdtemp(path.join(os.tmpdir(), "wpsc-c040-immutable-")), "package");
  const builder = createProductionPackageBuilder();
  await builder.build({ evidence: fixtureEvidence(), sourceDir: source, targetDir: target, version: "1.0.0" });
  await assert.rejects(() => builder.build({ evidence: fixtureEvidence(), sourceDir: source, targetDir: target, version: "1.0.0" }), /immutable/);
});

test("C040 rejects development, mutable and credential-bearing paths even if evidence requests them", async () => {
  const source = await fixtureSource();
  for (const forbidden of ["sites/company/secret.txt", "storage/state.json", "public/index.html", "test/fixture.mjs", ".env"]) {
    const evidence = createProductionDependencyEvidence({ features: { unsafe: { assets: [forbidden], entrypoints: ["framework/entry.mjs"] } }, modules: fixtureModules() });
    const target = path.join(await mkdtemp(path.join(os.tmpdir(), "wpsc-c040-reject-")), "package");
    await assert.rejects(() => createProductionPackageBuilder().build({ evidence, sourceDir: source, targetDir: target, version: "1.0.0" }), /cannot enter a production package/);
  }
});

function fixtureEvidence() {
  return createProductionDependencyEvidence({ features: { woocommerce: { assets: ["assets/storefront.css"], entrypoints: ["framework/entry.mjs"], plugins: ["plugins/commerce/plugin.mjs"], templates: ["templates/product.html"] } }, modules: fixtureModules() });
}
function fixtureModules() {
  return {
    "framework/dynamic.mjs": {},
    "framework/entry.mjs": { dynamicImports: ["framework/dynamic.mjs"], imports: ["framework/runtime.mjs"] },
    "framework/runtime.mjs": {}
  };
}
async function fixtureSource() {
  const source = await mkdtemp(path.join(os.tmpdir(), "wpsc-c040-source-"));
  const files = {
    ".env": "PASSWORD=fixture-secret-value\n",
    "assets/storefront.css": ".shop{}\n",
    "framework/dynamic.mjs": "export default 'dynamic';\n",
    "framework/entry.mjs": "import { provider } from './runtime.mjs'; export async function bootCommerce(){const feature=await import('./dynamic.mjs');return provider+':'+feature.default}\n",
    "framework/runtime.mjs": "export const provider='woocommerce';\n",
    "plugins/commerce/plugin.mjs": "export default {name:'commerce'};\n",
    "public/index.html": "mutable public output",
    "sites/company/secret.txt": "fixture-secret-value",
    "storage/state.json": "{\"token\":\"fixture-secret-value\"}",
    "templates/product.html": "<main>Product</main>\n",
    "test/fixture.mjs": "throw new Error('development only');\n"
  };
  for (const [relative, content] of Object.entries(files)) { await mkdir(path.dirname(path.join(source, relative)), { recursive: true }); await writeFile(path.join(source, relative), content); }
  return source;
}
