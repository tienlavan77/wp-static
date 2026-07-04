import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("real source integration docs include auth and endpoint checklist", async () => {
  const docs = await readFile("docs/real-source-integration.md", "utf8");

  assert.match(docs, /applicationPassword/);
  assert.match(docs, /WPSC_WP_APP_PASSWORD/);
  assert.match(docs, /WPSC_WOO_CONSUMER_KEY/);
  assert.match(docs, /Rank Math/);
  assert.match(docs, /ACF/);
  assert.match(docs, /CPT slugs/);
});
