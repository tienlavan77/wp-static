import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import validateProjectConfig from "../src/validation/validateProjectConfig.js";
import { formatValidationResults } from "../src/validation/formatValidationResults.js";

test("validateProjectConfig reports valid project checks before build", async () => {
  const projectDir = await createProject({
    config: `
      export default {
        name: "Validate Test",
        homepage: "home",
        outputDir: "./dist",
        adapter: {
          type: "mock",
          source: "./content.json"
        },
        theme: {
          layout: "./theme/layout.js"
        }
      };
    `
  });

  const results = await validateProjectConfig(projectDir);

  assert.equal(results.some((result) => result.name === "Config syntax" && result.status === "ok"), true);
  assert.equal(results.some((result) => result.name === "Adapter source" && result.status === "ok"), true);
  assert.equal(results.some((result) => result.name === "Theme layout" && result.status === "ok"), true);
  assert.equal(results.some((result) => result.name === "Runtime configuration" && result.status === "warning"), true);
  assert.equal(results.some((result) => result.name === "Output directory" && result.status === "ok"), true);
  assert.equal(results.every((result) => result.ok), true);
});

test("validateProjectConfig reports actionable adapter URL errors", async () => {
  const projectDir = await createProject({
    config: `
      export default {
        name: "Validate Test",
        homepage: "home",
        outputDir: "./dist",
        adapter: {
          type: "wordpress",
          baseUrl: "not-a-url"
        },
        theme: {
          layout: "./theme/layout.js"
        }
      };
    `
  });

  const results = await validateProjectConfig(projectDir);
  const adapterUrl = results.find((result) => result.name === "WordPress REST URL");

  assert.equal(adapterUrl.status, "error");
  assert.match(adapterUrl.fix, /adapter\.baseUrl/);
});

test("validateProjectConfig output can be formatted as JSON", async () => {
  const projectDir = await createProject({
    config: `
      export default {
        name: "Validate Test",
        homepage: "home",
        outputDir: "./dist",
        adapter: {
          type: "mock",
          source: "./content.json"
        },
        theme: {
          layout: "./theme/layout.js"
        }
      };
    `
  });

  const results = await validateProjectConfig(projectDir);
  const payload = JSON.parse(formatValidationResults(results, { format: "json" }));

  assert.equal(payload.summary.error, 0);
  assert.equal(payload.results.some((result) => result.category === "runtime"), true);
});

async function createProject(options = {}) {
  const projectDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-validate-"));

  await mkdir(path.join(projectDir, "theme"), { recursive: true });
  await writeFile(path.join(projectDir, "wpsc.config.js"), options.config, "utf8");
  await writeFile(path.join(projectDir, "content.json"), JSON.stringify({
    contents: [
      {
        id: "home",
        slug: "home",
        title: "Home",
        type: "page"
      }
    ]
  }), "utf8");
  await writeFile(path.join(projectDir, "theme", "layout.js"), "export default function layout() { return '<main></main>'; }", "utf8");

  return projectDir;
}
