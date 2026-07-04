# Visual Builder Layouts

Phase 24 defines the JSON shape that a drag-and-drop builder can save before the static renderer consumes it.

## Layout Document

```json
{
  "id": "product-default",
  "name": "Default Product",
  "version": 1,
  "contentTypes": ["product"],
  "sections": []
}
```

Fields:

- `id`: stable layout key.
- `name`: editor-facing name.
- `version`: layout schema version, currently `1`.
- `contentTypes`: content targets such as `page`, `post`, `product`, `category`, `tag`, `product_cat`, or `product_tag`.
- `sections`: top-level section nodes.

## Nodes

Sections can contain other sections or blocks:

```json
{
  "id": "product-summary",
  "type": "section",
  "settings": {
    "width": "content"
  },
  "children": [
    {
      "id": "product-title",
      "type": "block",
      "blockName": "core/heading",
      "bindings": {
        "text": {
          "source": "content",
          "path": "title"
        }
      }
    }
  ]
}
```

Block nodes map to block schemas registered by `createBlockRegistry`. Section nodes only describe structure and editor/layout settings. Rendering arrives in Phase 25.

## Content Type Index

Use `createContentTypeLayoutIndex(layouts)` to resolve the active layout for a content type:

```js
const index = createContentTypeLayoutIndex(layouts);
const layout = index.find("product");
```

The index rejects duplicate content type mappings so the builder does not silently pick the wrong layout.
