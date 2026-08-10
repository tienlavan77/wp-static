import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import createProductionDependencyEvidence from "../framework/src/product/package/createProductionDependencyEvidence.js";
import createProductionPackageBuilder from "../framework/src/product/package/createProductionPackageBuilder.js";
import createProductionPackageBundle from "../framework/src/product/package/createProductionPackageBundle.js";

const cli = path.resolve("framework/src/cli/index.js");

test("C050 public CLI completes the local build, verify, dry-run, publish and idempotency workflow", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "wpsc-c050-e2e-"));
  try {
    const fixture = await releaseFixture(root, "runtime-a");
    const distribution = path.join(root, "distribution");
    const config = path.join(root, "release-operations.json");
    await writeFile(config, JSON.stringify({ schema: "wpsc.release-operations", schemaVersion: 1, channels: { local: { artifactBaseUrl: "https://releases.example.test/wpsc/", allowedHosts: ["releases.example.test"], publisher: { root: distribution } } }, signing: { publicKeyPath: fixture.publicKeyPath } }));

    const verify = run(["product", "release", "verify", "--package-dir", fixture.packageDir, "--public-key", fixture.publicKeyPath, "--json"]);
    assert.equal(verify.status, 0, verify.stderr);
    assert.equal(JSON.parse(verify.stdout).accepted, true);

    const noConfirm = run(["product", "release", "publish", "--package-dir", fixture.packageDir, "--artifact", fixture.bundle, "--config", config, "--channel", "local", "--json"]);
    assert.equal(noConfirm.status, 1);
    assert.equal(JSON.parse(noConfirm.stdout).code, "CONFIRMATION_REQUIRED");
    await assert.rejects(() => stat(distribution));

    const dryRun = run(["product", "release", "publish", "--package-dir", fixture.packageDir, "--artifact", fixture.bundle, "--config", config, "--channel", "local", "--dry-run", "--json"]);
    assert.equal(dryRun.status, 0, `${dryRun.stderr}\n${dryRun.stdout}`);
    assert.equal(JSON.parse(dryRun.stdout).status, "DRY_RUN");
    await assert.rejects(() => stat(distribution));

    const first = run(["product", "release", "publish", "--package-dir", fixture.packageDir, "--artifact", fixture.bundle, "--config", config, "--channel", "local", "--confirm", "--json"]);
    assert.equal(first.status, 0, first.stderr);
    assert.equal(JSON.parse(first.stdout).status, "PUBLISHED");
    const published = path.join(distribution, "1.2.0", "wpsc-1.2.0.bundle.json");
    assert.equal((await stat(published)).size, (await stat(fixture.bundle)).size);

    const second = run(["product", "release", "publish", "--package-dir", fixture.packageDir, "--artifact", fixture.bundle, "--config", config, "--channel", "local", "--confirm", "--json"]);
    assert.equal(second.status, 0, second.stderr);
    assert.equal(JSON.parse(second.stdout).status, "IDEMPOTENT_SUCCESS");
  } finally { await rm(root, { force: true, recursive: true }); }
});

test("C050 verify-installation resolves explicit Registry identity outside workspace", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "wpsc-c050-installation-"));
  try {
    const workspace = path.join(root, "installation");
    const registry = path.join(root, "installations.json");
    await mkdir(path.join(workspace, "storage", "installer"), { recursive: true });
    await writeFile(registry, JSON.stringify({ schema: "wpsc.installation-registry", schemaVersion: 1, revision: 0, installations: { "local-test": { workspace } } }));
    await writeFile(path.join(workspace, "storage", "installer", "health.json"), JSON.stringify({ state: "HEALTHY" }));
    await writeFile(path.join(workspace, "storage", "installer", "c049-self-update-evidence.json"), JSON.stringify({ schema: "wpsc.c049-self-update", status: "PASS", transactionId: "local-evidence" }));
    const result = run(["product", "verify-installation", "--installation", "local-test", "--json"], { WPSC_INSTALLATION_REGISTRY_PATH: registry });
    assert.equal(result.status, 0, result.stderr);
    const output = JSON.parse(result.stdout);
    assert.equal(output.installationId, "local-test");
    assert.equal(output.workspace, workspace);
    assert.equal(output.health.state, "HEALTHY");
  } finally { await rm(root, { force: true, recursive: true }); }
});

test("C050 root rollout delegates dry-run and confirmed mutation to the Installation-owned C049 composition", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "wpsc-c050-rollout-e2e-"));
  try {
    const workspace = path.join(root, "installation");
    const registry = path.join(root, "installations.json");
    const config = path.join(root, "release-operations.json");
    const marker = path.join(root, "update-called.json");
    await mkdir(path.join(workspace, "config"), { recursive: true });
    await writeFile(registry, JSON.stringify({ schema: "wpsc.installation-registry", schemaVersion: 1, revision: 0, installations: { "local-rollout": { workspace } } }));
    await writeFile(config, JSON.stringify({ schema: "wpsc.release-operations", schemaVersion: 1, channels: { local: { artifactBaseUrl: "https://releases.example.test/wpsc/", allowedHosts: ["releases.example.test"] } } }));
    await writeFile(path.join(workspace, "config", "c049-release-update-runtime.mjs"), `import { writeFile } from "node:fs/promises";
export default async ({ installationId }) => ({
  check: async () => ({ ok: true, currentVersion: "1.1.0", available: { version: "1.2.0" }, status: "UPDATE_AVAILABLE" }),
  update: async () => { await writeFile(${JSON.stringify(marker)}, JSON.stringify({ installationId })); return { ok: true, finalVersion: "1.2.0", status: "PASS", transactionId: "local-rollout-transaction", evidence: { schema: "wpsc.c049-self-update", status: "PASS", transactionId: "local-rollout-transaction" } }; },
  status: async () => ({ ok: true, transaction: { state: "COMPLETED", transactionId: "local-rollout-transaction" } })
});\n`);
    const env = { WPSC_INSTALLATION_REGISTRY_PATH: registry };
    const dryRun = run(["product", "rollout", "--installation", "local-rollout", "--channel", "local", "--config", config, "--dry-run", "--json"], env);
    assert.equal(dryRun.status, 0, dryRun.stderr);
    assert.equal(JSON.parse(dryRun.stdout).mutation, "NONE");
    await assert.rejects(() => stat(marker));
    const confirmed = run(["product", "rollout", "--installation", "local-rollout", "--channel", "local", "--config", config, "--confirm", "--json"], env);
    assert.equal(confirmed.status, 0, confirmed.stderr);
    const output = JSON.parse(confirmed.stdout);
    assert.equal(output.transactionId, "local-rollout-transaction");
    assert.equal(JSON.parse(await readFile(marker, "utf8")).installationId, "local-rollout");
  } finally { await rm(root, { force: true, recursive: true }); }
});

async function releaseFixture(root, contents) {
  const source = path.join(root, `source-${contents}`);
  const packageDir = path.join(root, `package-${contents}`);
  const bundle = path.join(root, `wpsc-1.2.0-${contents}.bundle.json`);
  await mkdir(path.join(source, "framework"), { recursive: true });
  await writeFile(path.join(source, "framework", "entry.mjs"), `export default ${JSON.stringify(contents)};\n`);
  const keys = generateKeyPairSync("ed25519");
  const publicKeyPath = path.join(root, `public-${contents}.pem`);
  await writeFile(publicKeyPath, keys.publicKey.export({ format: "pem", type: "spki" }));
  const evidence = createProductionDependencyEvidence({ features: { core: { entrypoints: ["framework/entry.mjs"] } }, modules: { "framework/entry.mjs": {} } });
  await createProductionPackageBuilder({ sign: async (value) => sign(null, value, keys.privateKey).toString("base64") }).build({ evidence, sourceDir: source, targetDir: packageDir, version: "1.2.0" });
  await createProductionPackageBundle().build({ outputFile: bundle, packageDir });
  return { bundle, packageDir, publicKeyPath };
}

function run(args, extraEnv = {}) { return spawnSync(process.execPath, [cli, ...args], { cwd: os.tmpdir(), encoding: "utf8", env: { ...process.env, ...extraEnv } }); }
