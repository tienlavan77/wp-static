import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const workspacePackages = [
  "packages/adapters/package.json",
  "packages/builder/package.json",
  "packages/builder-ui/package.json",
  "packages/cli/package.json",
  "packages/core/package.json",
  "packages/renderer/package.json",
  "packages/router/package.json",
  "packages/shared/package.json"
];

const v1Docs = [
  "docs/v1/README.md",
  "docs/v1/build-and-deploy.md",
  "docs/v1/builder-and-theme.md",
  "docs/v1/source-integration.md",
  "docs/v1-plugin-api.md",
  "docs/v1-theme-api.md",
  "docs/v1-adapter-api.md"
];

test("v1 release metadata is stable and versioned", async () => {
  const api = await import("../framework/src/index.js");
  const rootPackage = JSON.parse(await readFile("package.json", "utf8"));

  assert.equal(rootPackage.version, "1.0.0");
  assert.equal(api.version, rootPackage.version);
  assert.deepEqual(api.getPackageInfo(), {
    name: "wpsc",
    version: "1.0.0",
    status: "stable"
  });

  for (const packagePath of workspacePackages) {
    const workspacePackage = JSON.parse(await readFile(packagePath, "utf8"));
    assert.equal(workspacePackage.version, "1.0.0", `${packagePath} should be v1`);
  }
});

test("v1 contracts and documentation are published", async () => {
  const api = await import("../framework/src/index.js");

  assert.deepEqual(api.V1_PLUGIN_HOOKS, [
    "data",
    "routes",
    "render",
    "buildStart",
    "buildEnd"
  ]);
  assert.deepEqual(api.V1_ADAPTER_REQUIRED_METHODS, ["getContents"]);
  assert.deepEqual(api.V1_ADAPTER_OPTIONAL_METHODS, ["getCollections", "getCacheKey"]);
  assert(api.V1_THEME_CONFIG_FIELDS.includes("layout"));
  assert(api.V1_THEME_LAYOUT_CONTEXT_FIELDS.includes("content"));

  for (const docPath of v1Docs) {
    const doc = await readFile(docPath, "utf8");
    assert.match(doc, /v1|V1|1\.0/, `${docPath} should describe v1`);
  }
});
