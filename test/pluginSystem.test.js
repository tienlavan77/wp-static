import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import buildSite from "../src/builder/buildSite.js";
import compile from "../src/core/compile.js";
import loadConfig from "../src/core/loadConfig.js";

test("plugin hooks can transform data, render html, and observe builds", async () => {
  const outputDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-plugin-"));
  const markerPath = path.join(outputDir, "plugin-marker.txt");
  const config = await loadConfig("examples/basic-shop");
  const testConfig = {
    ...config,
    outputDir,
    plugins: [
      {
        path: "./plugins/example-plugin.js",
        options: {
          markerPath
        }
      }
    ],
    _paths: {
      ...config._paths,
      outputDir
    }
  };
  const sitePlan = await compile(testConfig);
  const result = await buildSite(sitePlan, {
    config: testConfig,
    outputDir,
    publicDir: config._paths.publicDir,
    site: config.site,
    themeAssetsDir: sitePlan.theme.assetsDir
  });
  const pluginPage = await readFile(path.join(outputDir, "plugin-demo.html"), "utf8");
  const marker = await readFile(markerPath, "utf8");
  const manifest = JSON.parse(await readFile(result.manifestPath, "utf8"));

  assert.equal(sitePlan.plugins[0].name, "example-plugin");
  assert.equal(result.pagesWritten, 9);
  assert.match(pluginPage, /Plugin demo/);
  assert.match(pluginPage, /rendered-by-example-plugin/);
  assert.match(marker, /example-plugin buildEnd/);
  assert.deepEqual(manifest.plugins, [{ name: "example-plugin" }]);
});
