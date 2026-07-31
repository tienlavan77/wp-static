import assertBuilderEditorAccess from "./assertBuilderEditorAccess.js";
import createBuilderPublishChange from "./createBuilderPublishChange.js";
import createLayoutRevisionStore from "./createLayoutRevisionStore.js";

export default function createBuilderWorkflow(options = {}) {
  const config = options.config ?? {};
  const store = options.store ?? createLayoutRevisionStore({
    baseDir: options.layoutDir ?? config._paths?.builderLayouts ?? config.builder?.layoutsDir
  });
  const rebuildQueue = options.rebuildQueue ?? null;

  return {
    async saveDraft(layout, request = {}) {
      assertBuilderEditorAccess(config, request);
      return store.saveDraft(layout);
    },
    async publish(layoutId, request = {}) {
      assertBuilderEditorAccess(config, request);
      const result = await store.publish(layoutId);
      const rebuild = rebuildQueue
        ? await rebuildQueue.enqueue({
          changes: [createBuilderPublishChange(layoutId)],
          payload: result.record.published,
          reason: `builder layout publish: ${layoutId}`
        })
        : null;

      return {
        ...result,
        rebuild
      };
    },
    store
  };
}
