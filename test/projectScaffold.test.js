import assert from "node:assert/strict";
import { access, mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import createProjectScaffold, {
  STARTER_TEMPLATES,
  normalizeTemplate
} from "../framework/src/core/createProjectScaffold.js";
import validateProjectConfig from "../framework/src/validation/validateProjectConfig.js";

test("createProjectScaffold lists supported starter templates", () => {
  assert.deepEqual(STARTER_TEMPLATES, [
    "blank",
    "blog",
    "catalog",
    "commerce",
    "corporate"
  ]);
  assert.equal(normalizeTemplate(), "commerce");
  assert.equal(normalizeTemplate(" Blog "), "blog");
  assert.throws(() => normalizeTemplate("unknown"), /Unknown starter template/);
});

test("createProjectScaffold creates every starter template", async () => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-scaffold-"));

  for (const template of STARTER_TEMPLATES) {
    const projectDir = path.join(rootDir, template);
    const result = await createProjectScaffold(projectDir, {
      template
    });

    assert.equal(result.template, template);
    assert.equal(result.projectDir, projectDir);
    assert.equal(result.files.some((file) => file.endsWith("wpsc.config.js")), true);

    await access(path.join(projectDir, "content.json"));
    await access(path.join(projectDir, "wpsc.config.js"));
    await access(path.join(projectDir, "theme", "layout.js"));
    await access(path.join(projectDir, "public", "style.css"));

    const checks = await validateProjectConfig(projectDir);
    assert.equal(checks.every((check) => check.ok), true);
  }
});

test("createProjectScaffold protects existing projects", async () => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-scaffold-"));
  const projectDir = path.join(rootDir, "shop");

  await createProjectScaffold(projectDir, {
    template: "commerce"
  });

  await assert.rejects(
    () => createProjectScaffold(projectDir, {
      template: "commerce"
    }),
    /Project already exists/
  );
});

test("createProjectScaffold creates missing parent directories", async () => {
  const rootDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-scaffold-"));
  const projectDir = path.join(rootDir, "nested", "shop");
  const result = await createProjectScaffold(projectDir, {
    template: "blank"
  });

  assert.equal(result.projectDir, projectDir);
  await access(path.join(projectDir, "wpsc.config.js"));
});
