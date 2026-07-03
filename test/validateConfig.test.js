import assert from "node:assert/strict";
import test from "node:test";
import validateConfig from "../src/core/validateConfig.js";

test("validateConfig accepts a valid mock config", () => {
  const config = validateConfig({
    name: "Shop",
    homepage: "home",
    outputDir: "./dist",
    adapter: {
      type: "mock",
      source: "./content.json"
    },
    theme: {
      layout: "./theme/layout.js"
    }
  });

  assert.equal(config.name, "Shop");
});

test("validateConfig fails with clear field name", () => {
  assert.throws(
    () => validateConfig({}),
    /Config field "name" is required/
  );
});
