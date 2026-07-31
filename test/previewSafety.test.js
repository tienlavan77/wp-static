import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import buildProjectOnce from "../framework/src/dev-server/buildProjectOnce.js";
import compile from "../framework/src/core/compile.js";
import createContent from "../framework/src/core/createContent.js";
import filterPublicContents from "../framework/src/preview/filterPublicContents.js";

test("filterPublicContents excludes draft and private content by default", () => {
  const contents = [
    createContent(createRawContent("public", "publish")),
    createContent(createRawContent("draft", "draft")),
    createContent(createRawContent("private", "private")),
    createContent(createRawContent("legacy", null))
  ];
  const filtered = filterPublicContents(contents);

  assert.deepEqual(filtered.map((content) => content.slug), ["public", "legacy"]);
});

test("compile includes private content only in preview mode", async () => {
  const projectDir = await createPreviewProject();
  const config = (await import(`file://${projectDir}/wpsc.config.js?t=${Date.now()}`)).default;
  const normalizedConfig = {
    ...config,
    _paths: {
      adapterSource: path.join(projectDir, "content.json"),
      outputDir: path.join(projectDir, "dist"),
      projectDir,
      publicDir: null,
      themeLayout: path.join(projectDir, "theme/layout.js"),
      themeLayouts: {}
    }
  };
  const publicPlan = await compile(normalizedConfig, { projectDir });
  const previewPlan = await compile(normalizedConfig, {
    preview: true,
    projectDir
  });

  assert.deepEqual(publicPlan.routes.map((route) => route.path), ["/"]);
  assert.deepEqual(previewPlan.routes.map((route) => route.path), ["/", "/draft-page"]);
});

test("buildProjectOnce requires a valid preview token for preview builds", async () => {
  const projectDir = await createPreviewProject();

  await assert.rejects(
    () => buildProjectOnce(projectDir, {
      env: {
        WPSC_PREVIEW_TOKEN: "secret"
      },
      preview: true,
      previewToken: "wrong"
    }),
    /Preview token is invalid/
  );

  const result = await buildProjectOnce(projectDir, {
    env: {
      WPSC_PREVIEW_TOKEN: "secret"
    },
    preview: true,
    previewToken: "secret"
  });

  assert.equal(result.sitePlan.pages.length, 2);
});

async function createPreviewProject() {
  const projectDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-preview-"));

  await writeFile(path.join(projectDir, "content.json"), JSON.stringify([
    createRawContent("home", "publish"),
    createRawContent("draft-page", "draft")
  ], null, 2), "utf8");
  await writeFile(path.join(projectDir, "wpsc.config.js"), `
export default {
  name: "Preview Test",
  homepage: "home",
  outputDir: "./dist",
  adapter: {
    type: "mock",
    source: "./content.json"
  },
  preview: {
    tokenEnv: "WPSC_PREVIEW_TOKEN"
  },
  theme: {
    layout: "./theme/layout.js"
  }
};
`, "utf8");
  await mkdir(path.join(projectDir, "theme"));
  await writeFile(path.join(projectDir, "theme/layout.js"), "export default ({ content, html }) => html`<main>${content.title}</main>`;\n", "utf8");

  return projectDir;
}

function createRawContent(slug, status) {
  return {
    data: {
      description: slug
    },
    domain: "test",
    id: `page-${slug}`,
    slug,
    status,
    title: slug,
    type: "page"
  };
}
