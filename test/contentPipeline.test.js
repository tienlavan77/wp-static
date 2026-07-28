import assert from "node:assert/strict";
import test from "node:test";
import createContentPipeline, { CONTENT_PIPELINE_VERSION } from "../src/content/createContentPipeline.js";

test("Content Pipeline normalizes, transforms, filters, and freezes its Content Model", () => {
  const pipeline = createContentPipeline({
    filters: [(item) => item.data.visible !== false],
    transformers: [(item) => ({ ...item, title: item.title.toUpperCase() })]
  });
  const result = pipeline.run([
    { data: { visible: true }, id: 1, slug: "welcome", title: "Welcome", type: "page" },
    { data: { visible: false }, id: 2, slug: "private", title: "Private", type: "page" }
  ]);
  assert.equal(pipeline.version, CONTENT_PIPELINE_VERSION);
  assert.equal(result.ok, true);
  assert.deepEqual(result.model.items, [{ data: { visible: true }, id: "1", slug: "welcome", title: "WELCOME", type: "page" }]);
  assert.equal(Object.isFrozen(result.model), true);
});

test("Content Pipeline returns shared diagnostics for invalid input", () => {
  const result = createContentPipeline().run([{ id: 1, type: "page" }]);
  assert.equal(result.ok, false);
  assert.equal(result.diagnostics.errors[0].code, "content.pipeline.content.invalid");
  assert.equal(result.diagnostics.errors[0].severity, "error");
});
