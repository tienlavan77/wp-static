import assert from "node:assert/strict";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import loadConfig from "../src/core/loadConfig.js";
import resolveTheme from "../src/theme/resolveTheme.js";
import renderLayout from "../src/visual-builder/renderLayout.js";
import renderThemePreview from "../src/visual-builder/renderThemePreview.js";

test("theme exposes a block library", async () => {
  const config = await loadConfig("examples/basic-shop");
  const theme = await resolveTheme(config, config._paths.projectDir);

  assert.equal(theme.blocks.some((block) => block.name === "theme/badge"), true);
  assert.equal(theme.blocks.some((block) => block.name === "core/heading"), true);
});

test("builder loads theme blocks and theme overrides", async () => {
  const config = await loadConfig("examples/basic-shop");
  const theme = await resolveTheme(config, config._paths.projectDir);
  const result = renderLayout({
    contentTypes: ["page"],
    id: "theme-preview",
    sections: [{
      children: [{
        blockName: "theme/badge",
        id: "badge",
        props: {
          text: "Theme Block"
        },
        type: "block"
      }, {
        blockName: "core/heading",
        id: "heading",
        props: {
          text: "Theme Heading"
        },
        type: "block"
      }],
      id: "main"
    }]
  }, {
    theme
  });

  assert.equal(result.errors.length, 0);
  assert.match(result.html, /class="theme-badge"/);
  assert.match(result.html, /class="theme-heading"/);
});

test("project blocks override theme blocks", async () => {
  const projectDir = await createProjectWithBlockOverride();
  const config = await loadConfig(projectDir);
  const theme = await resolveTheme(config, projectDir);
  const result = renderLayout({
    contentTypes: ["page"],
    id: "override-preview",
    sections: [{
      children: [{
        blockName: "theme/badge",
        id: "badge",
        props: {
          text: "Override"
        },
        type: "block"
      }],
      id: "main"
    }]
  }, {
    theme
  });

  assert.equal(result.errors.length, 0);
  assert.match(result.html, /project-badge/);
});

test("theme preview wraps rendered blocks with theme metadata", async () => {
  const config = await loadConfig("examples/basic-shop");
  const theme = await resolveTheme(config, config._paths.projectDir);
  const result = renderThemePreview({
    contentTypes: ["page"],
    id: "preview",
    sections: [{
      children: [{
        blockName: "theme/badge",
        id: "badge",
        type: "block"
      }],
      id: "main"
    }]
  }, {
    theme
  });

  assert.equal(result.errors.length, 0);
  assert.match(result.html, /wpsc-theme-preview/);
  assert.match(result.html, /Basic Commerce Theme/);
  assert.match(result.html, /theme-badge/);
});

async function createProjectWithBlockOverride() {
  const projectDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-project-blocks-"));

  await mkdir(path.join(projectDir, "theme"), { recursive: true });
  await writeFile(path.join(projectDir, "content.json"), "[]\n", "utf8");
  await writeFile(
    path.join(projectDir, "wpsc.config.js"),
    [
      "export default {",
      '  name: "Project Blocks",',
      '  homepage: "home",',
      '  outputDir: "./dist",',
      '  adapter: { type: "mock", source: "./content.json" },',
      '  theme: { layout: "./theme/layout.js", blocks: "./theme/blocks.js" },',
      '  project: { blocks: "./theme/project-blocks.js" }',
      "};",
      ""
    ].join("\n"),
    "utf8"
  );
  await writeFile(
    path.join(projectDir, "theme", "layout.js"),
    "export default ({ html }) => html`<main></main>`;\n",
    "utf8"
  );
  await writeFile(
    path.join(projectDir, "theme", "blocks.js"),
    [
      "export default [{",
      '  name: "theme/badge",',
      '  label: "Theme Badge",',
      '  props: { text: { type: "string", default: "Theme" } },',
      '  render({ html, props }) { return html`<p class="theme-badge">${props.text}</p>`; }',
      "}];",
      ""
    ].join("\n"),
    "utf8"
  );
  await writeFile(
    path.join(projectDir, "theme", "project-blocks.js"),
    [
      "export default [{",
      '  name: "theme/badge",',
      '  label: "Project Badge",',
      '  props: { text: { type: "string", default: "Project" } },',
      '  render({ html, props }) { return html`<p class="project-badge">${props.text}</p>`; }',
      "}];",
      ""
    ].join("\n"),
    "utf8"
  );

  return projectDir;
}
