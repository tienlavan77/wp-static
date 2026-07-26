import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import createRebuildQueue from "../src/queue/createRebuildQueue.js";
import assertBuilderEditorAccess from "../src/visual-builder/production/assertBuilderEditorAccess.js";
import createBuilderWorkflow from "../src/visual-builder/production/createBuilderWorkflow.js";
import createLayoutRevisionStore from "../src/visual-builder/production/createLayoutRevisionStore.js";

const layout = {
  contentTypes: ["page"],
  id: "home-layout",
  name: "Home Layout",
  sections: [],
  version: 1
};

test("assertBuilderEditorAccess guards editor token access", () => {
  const config = {
    builder: {
      editor: {
        tokenEnv: "WPSC_BUILDER_TOKEN"
      }
    }
  };

  assert.throws(() => assertBuilderEditorAccess(config, {
    editorToken: "wrong",
    env: {
      WPSC_BUILDER_TOKEN: "secret"
    }
  }), /Builder editor token is invalid/);

  assert.equal(assertBuilderEditorAccess(config, {
    editorToken: "secret",
    env: {
      WPSC_BUILDER_TOKEN: "secret"
    }
  }), true);
});

test("createLayoutRevisionStore saves draft and published revisions", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-layout-store-"));
  const store = createLayoutRevisionStore({
    baseDir
  });

  const draft = await store.saveDraft(layout);
  const published = await store.publish(layout.id);
  const record = await store.load(layout.id);

  assert.equal(draft.revision.status, "draft");
  assert.equal(published.revision.status, "published");
  assert.equal(record.draft.id, layout.id);
  assert.equal(record.published.id, layout.id);
  assert.equal(record.revisions.length, 2);
});

test("createBuilderWorkflow saves drafts with auth and publishes with rebuild trigger", async () => {
  const baseDir = await mkdtemp(path.join(os.tmpdir(), "wpsc-builder-workflow-"));
  const rebuilds = [];
  const workflow = createBuilderWorkflow({
    config: {
      builder: {
        editor: {
          tokenEnv: "WPSC_BUILDER_TOKEN"
        }
      }
    },
    layoutDir: baseDir,
    rebuildQueue: createRebuildQueue({
      rebuild: async (request) => {
        rebuilds.push(request);

        return {
          ok: true
        };
      }
    })
  });
  const request = {
    editorToken: "secret",
    env: {
      WPSC_BUILDER_TOKEN: "secret"
    }
  };

  await workflow.saveDraft(layout, request);
  const result = await workflow.publish(layout.id, request);

  assert.equal(result.record.published.id, layout.id);
  assert.equal(result.rebuild.status, "built");
  assert.equal(rebuilds[0].changes[0].source, "builder");
  assert.equal(rebuilds[0].changes[0].type, "layout");
});
