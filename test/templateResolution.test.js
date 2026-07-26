import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import buildSite from "../src/builder/buildSite.js";
import compile from "../src/core/compile.js";
import loadConfig from "../src/core/loadConfig.js";
import createTemplateManifest, { createTemplateScope } from "../src/templates/createTemplateManifest.js";
import resolveTemplateForRoute, { createTemplateCandidates } from "../src/templates/resolveTemplateForRoute.js";

test("createTemplateCandidates orders exact, home, type, taxonomy, and archive fallbacks", () => {
  assert.deepEqual(createTemplateCandidates({
    content: {
      id: "page-home",
      type: "page"
    },
    path: "/"
  }).map((candidate) => candidate.scope), [
    "route:/",
    "content:page-home",
    "home",
    "contentType:page"
  ]);
  assert.deepEqual(createTemplateCandidates({
    archive: {
      taxonomy: "product_cat"
    },
    content: {
      id: "archive:product_cat:decal:page:1",
      type: "archive:product_cat"
    },
    path: "/decal",
    type: "archive"
  }).map((candidate) => candidate.scope), [
    "route:/decal",
    "content:archive:product_cat:decal:page:1",
    "taxonomy:product_cat",
    "archive"
  ]);
});

test("resolveTemplateForRoute loads the first matching template document", async () => {
  const templatesDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-templates-"));

  await writeTemplate(path.join(templatesDir, "page.json"), {
    contentTypes: ["page"],
    id: "page-template",
    sections: [{
      children: [],
      id: "page-section",
      type: "section"
    }]
  });
  await writeTemplate(path.join(templatesDir, "home.json"), {
    contentTypes: ["home", "page"],
    id: "home-template",
    sections: [{
      children: [],
      id: "home-section",
      type: "section"
    }]
  });

  const template = await resolveTemplateForRoute({
    content: {
      id: "page-home",
      type: "page"
    },
    path: "/"
  }, {
    templatesDir
  });

  assert.equal(template.scope, "home");
  assert.equal(template.document.id, "home-template");
  assert.equal(template.path, path.join(templatesDir, "home.json"));
});

test("createTemplateManifest indexes stored builder templates by scope", async () => {
  const config = await loadConfig("examples/basic-shop");
  const manifest = await createTemplateManifest({
    config,
    projectDir: config._paths.projectDir
  });
  const scopes = manifest.templates.map((template) => template.scope);

  assert.equal(manifest.templatesDir, path.join(config._paths.projectDir, "layouts", "templates"));
  assert.deepEqual(scopes, [
    "archive",
    "home",
    "contentType:page",
    "contentType:post",
    "contentType:product",
    "taxonomy:product_cat"
  ]);
  assert.equal(manifest.templates.find((template) => template.scope === "contentType:product").id, "product-builder-template");
  assert.equal(createTemplateScope("routes/index.json"), "route:/");
  assert.equal(createTemplateScope("routes/san-pham__a.json"), "route:/san-pham/a");
  assert.equal(createTemplateScope("content/product-1.json"), "content:product-1");
  assert.equal(createTemplateScope("taxonomy.product_cat.json"), "taxonomy:product_cat");
});

test("compile renders homepage from builder template JSON", async () => {
  const outputDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-template-home-"));
  const config = await loadConfig("examples/basic-shop");
  const testConfig = {
    ...config,
    adapter: {
      source: "./content.json",
      type: "mock"
    },
    homepage: "home",
    outputDir,
    _paths: {
      ...config._paths,
      outputDir
    }
  };
  const sitePlan = await compile(testConfig);
  const homePage = sitePlan.pages.find((page) => page.route.path === "/");

  assert.match(homePage.html, /data-template-scope="home"/);
  assert.doesNotMatch(homePage.html, /Builder Template Home/);
  assert.doesNotMatch(homePage.html, /class="site-header"/);
  assert.match(sitePlan.pages.find((page) => page.route.path === "/gioi-thieu").html, /data-template-scope="contentType:page"/);
  assert.match(sitePlan.pages.find((page) => page.route.path === "/gioi-thieu").html, /page-builder-template/);
  assert.match(sitePlan.pages.find((page) => page.route.path === "/iphone-15").html, /data-template-scope="contentType:product"/);
  assert.match(sitePlan.pages.find((page) => page.route.path === "/iphone-15").html, /product-builder-template/);
  assert.match(sitePlan.pages.find((page) => page.route.path === "/dien-thoai").html, /data-template-scope="taxonomy:product_cat"/);
  assert.match(sitePlan.pages.find((page) => page.route.path === "/dien-thoai").html, /product-category-builder-template/);

  const result = await buildSite(sitePlan, {
    config: testConfig,
    outputDir,
    publicDir: config._paths.publicDir
  });
  const indexHtml = await readFile(path.join(outputDir, "index.html"), "utf8");
  const indexFragment = await readFile(path.join(outputDir, "fragments", "index", "main.html"), "utf8");
  const templateManifest = JSON.parse(await readFile(path.join(outputDir, "data", "templates", "manifest.json"), "utf8"));

  assert.equal(result.pagesWritten, sitePlan.pages.length);
  assert.equal(result.templateManifest.templates.length, 6);
  assert.equal(templateManifest.kind, "templateManifest");
  assert.equal(templateManifest.templates.some((template) => template.scope === "contentType:product"), true);
  assert.equal(templateManifest.templates.find((template) => template.scope === "home").document.id, "home-builder-template");
  assert.match(indexHtml, /data-template-scope="home"/);
  assert.match(indexFragment, /^<main\b/);
  assert.doesNotMatch(indexHtml, /class="site-header"/);
  assert.doesNotMatch(indexHtml, /class="theme-toggle"/);
  assert.doesNotMatch(indexFragment, /Builder Template Home/);
  assert.doesNotMatch(indexFragment, /wpsc-product-list/);
});

async function writeTemplate(filePath, template) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify({
    name: template.id,
    version: 1,
    ...template
  }, null, 2)}\n`, "utf8");
}
