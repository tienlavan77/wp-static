import assert from "node:assert/strict";
import test from "node:test";
import createReadOnlyReleaseOperationsFacade from "../framework/src/product/createReadOnlyReleaseOperationsFacade.js";
import { validateReleaseOperationsConfiguration } from "../framework/src/product/createReleaseOperationsConfiguration.js";

const configuration = {
  schema: "wpsc.release-operations",
  schemaVersion: 1,
  channels: { production: { artifactBaseUrl: "https://releases.example.test/wpsc/", allowedHosts: ["releases.example.test"] } },
  signing: { publicKeyPath: "/secure/public.pem" }
};

test("C050 configuration accepts credential-free allow-listed HTTPS channels", () => {
  const result = validateReleaseOperationsConfiguration(configuration);
  assert.equal(result.channels.production.artifactBaseUrl, "https://releases.example.test/wpsc/");
});

test("C050 configuration rejects unsafe schemas, credentials, hosts and key paths", () => {
  assert.throws(() => validateReleaseOperationsConfiguration({ ...configuration, schemaVersion: 2 }), /schema/);
  assert.throws(() => validateReleaseOperationsConfiguration({ ...configuration, channels: { production: { artifactBaseUrl: "https://user:secret@releases.example.test/", allowedHosts: ["releases.example.test"] } } }), /credential-free/);
  assert.throws(() => validateReleaseOperationsConfiguration({ ...configuration, channels: { production: { artifactBaseUrl: "https://evil.example/", allowedHosts: ["releases.example.test"] } } }), /allow-listed/);
  assert.throws(() => validateReleaseOperationsConfiguration({ ...configuration, signing: { publicKeyPath: "relative.pem" } }), /absolute/);
});

test("C050 release verification delegates to C041 without mutation", async () => {
  const calls = [];
  const facade = fixture({ verifier: { verifyPackage: async (input) => { calls.push(input); return { accepted: true, ok: true }; } } });
  const result = await facade.verifyRelease({ artifact: "/tmp/release", publicKey: "public" });
  assert.equal(result.accepted, true);
  assert.equal(result.mutation, "NONE");
  assert.equal(calls.length, 1);
});

test("C050 rollout dry-run resolves Registry workspace and calls check only", async () => {
  const calls = [];
  const facade = fixture({ releaseUpdate: { check: async () => { calls.push("check"); return { ok: true, status: "UPDATE_AVAILABLE", currentVersion: "1.1.0", available: { version: "1.2.0" } }; }, update: async () => calls.push("update"), recover: async () => calls.push("recover") } });
  const result = await facade.rollout({ channel: "production", dryRun: true, installationId: "example-installation" });
  assert.equal(result.workspace, "/srv/wpsc/example");
  assert.equal(result.mutation, "NONE");
  assert.deepEqual(calls, ["check"]);
});

test("C050 Installation verification reads existing health and evidence only", async () => {
  const facade = fixture({ health: { read: async () => ({ state: "HEALTHY" }), reportPath: "/srv/wpsc/example/health.md" }, evidence: { read: async () => ({ schema: "wpsc.c049-self-update", status: "PASS", transactionId: "release-update-1", protected: "not-returned" }) } });
  const result = await facade.verifyInstallation({ installationId: "example-installation" });
  assert.equal(result.ok, true);
  assert.equal(result.health.state, "HEALTHY");
  assert.deepEqual(result.evidence, { schema: "wpsc.c049-self-update", status: "PASS", transactionId: "release-update-1" });
  assert.equal(result.mutation, "NONE");
});

test("C050 Installation operations require explicit registered identity", async () => {
  const facade = fixture();
  await assert.rejects(() => facade.rollout({ channel: "production", dryRun: true }), /--installation/);
  assert.equal((await facade.rollout({ channel: "production", dryRun: true, installationId: "missing" })).code, "installation.not_found");
});

function fixture(overrides = {}) {
  return createReadOnlyReleaseOperationsFacade({
    configuration,
    registry: { read: async () => ({ installations: { "example-installation": { workspace: "/srv/wpsc/example" } } }) },
    releaseUpdate: { check: async () => ({ ok: true, status: "UP_TO_DATE" }) },
    verifier: { verifyPackage: async () => ({ accepted: true, ok: true }) },
    ...overrides
  });
}
