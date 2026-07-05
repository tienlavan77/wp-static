# Production Builder

Phase 28 adds the server-side pieces needed before the visual builder can become an editor tool.

## Editor Auth

Configure an editor token environment variable:

```js
export default {
  builder: {
    layoutsDir: "./layouts/editor",
    editor: {
      tokenEnv: "WPSC_BUILDER_TOKEN"
    }
  }
};
```

Callers must pass `editorToken` to `createBuilderWorkflow()` operations. The token is checked against `builder.editor.tokenEnv`.

## Drafts And Revisions

`createLayoutRevisionStore({ baseDir })` writes one JSON record per layout. Each record can contain:

- `draft`
- `published`
- `publishedAt`
- `revisions`
- `updatedAt`

`saveDraft(layout)` validates the layout document and appends a draft revision.

## Publish Flow

`publish(layoutId)` promotes the current draft to `published` and appends a published revision.

## Rebuild Trigger

When `createBuilderWorkflow()` receives a `rebuildQueue`, publishing a layout enqueues a rebuild request with source `builder` and type `layout`.

The builder UI remains intentionally simple for now. The important part is that saved layouts now have auth, revision history, draft/publish state, and a rebuild trigger contract.
