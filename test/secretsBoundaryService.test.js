import assert from "node:assert/strict";
import test from "node:test";
import createSecretsBoundaryService from "../framework/src/security/createSecretsBoundaryService.js";

test("Secrets Boundary injects only a referenced Site secret and projects safe configuration", async () => {
  const reads = [];
  const service = createSecretsBoundaryService({ credentialStore: { read: async (siteId) => { reads.push(siteId); return { applicationPassword: siteId === "alpha" ? "alpha-secret" : "beta-secret", wordpressUsername: "admin" }; } } });
  const reference = service.createReference("alpha", "applicationPassword");
  const received = await service.withSecret("alpha", reference, (secret) => `provider:${secret}`);

  assert.equal(received, "provider:alpha-secret");
  assert.deepEqual(reads, ["alpha"]);
  assert.equal(service.publicProjection({ endpoint: "https://source.test", applicationPassword: "alpha-secret" }).applicationPassword, "[REDACTED]");
  assert.throws(() => service.assertSafePublicContract({ credentials: { token: "never-public" } }, "rendering context"), /cannot contain secret field/);
});

test("Secrets Boundary rejects cross-Site secret references", async () => {
  const service = createSecretsBoundaryService({ credentialStore: { read: async () => ({ applicationPassword: "secret" }) } });
  const reference = service.createReference("alpha", "applicationPassword");
  await assert.rejects(service.withSecret("beta", reference, () => undefined), /cannot cross Site/);
});
