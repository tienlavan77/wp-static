# Template Storage

WPSC builder templates live in `layouts/templates` by default. They are layout JSON documents rendered at build time with the current route context.

Default template files:

```text
layouts/templates/home.json
layouts/templates/page.json
layouts/templates/post.json
layouts/templates/product.json
layouts/templates/taxonomy.product_cat.json
layouts/templates/archive.json
```

Resolution order:

```text
routes/{route}.json
content/{contentId}.json
home.json
taxonomy.{taxonomy}.json
{contentType}.json
archive.json
theme fallback
```

Projects can override the directory with:

```js
export default {
  templates: {
    dir: "./layouts/templates"
  }
};
```

The build output remains static HTML. The builder edits template JSON; it does not render public pages at runtime.
