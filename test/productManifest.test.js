import assert from "node:assert/strict";
import test from "node:test";
import createProductManifest, { validateProductCompatibility, validateProductManifest } from "../framework/src/product/createProductManifest.js";

test("Product Manifest is deterministic, versioned and immutable", () => {
  const first = createProductManifest({ version: "1.0.0" });
  const second = createProductManifest({ version: "1.0.0" });
  assert.deepEqual(first, second);
  assert.equal(first.schema, "wpsc.product");
  assert.equal(first.architectureVersion, "2.02");
  assert.equal(first.runtimeVersion, "1.0");
  assert.equal(Object.isFrozen(first), true);
  assert.equal(validateProductManifest(first).ok, true);
});

test("Product Manifest compatibility rejects incompatible Runtime, Node and schema versions", () => {
  const manifest = createProductManifest({ schemas: { siteRegistry: 1 }, version: "1.0.0" });
  assert.equal(validateProductCompatibility(manifest, { architectureVersion: "2.02", runtimeVersion: "1.0", nodeVersion: "20.1.0", schemas: { siteRegistry: 1 } }).ok, true);
  const incompatible = validateProductCompatibility(manifest, { architectureVersion: "2.03", runtimeVersion: "1.0", nodeVersion: "18.0.0", schemas: { siteRegistry: 2 } });
  assert.deepEqual(incompatible.errors.map((error) => error.code).sort(), ["product.compatibility.architecture.mismatch", "product.compatibility.node.unsupported", "product.compatibility.schema.mismatch"]);
});
