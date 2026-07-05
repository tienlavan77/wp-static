# Visual Builder Content Bindings

Layout JSON can bind block props to the current render context.

```json
{
  "type": "block",
  "blockName": "core/heading",
  "bindings": {
    "text": {
      "source": "content",
      "path": "data.title"
    }
  }
}
```

During rendering, bound values are merged into block props before validation. This lets blocks stay simple while the builder stores how each prop should read from `content`, `product`, `taxonomy`, `site`, or other context objects.
