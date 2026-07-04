# Block Authoring

Phase 23 adds the block schema foundation for the future visual builder.

## Block Schema

A block schema describes editor metadata, props, data bindings, and an optional render function:

```js
import { createBlockSchema } from "../src/index.js";

const heading = createBlockSchema({
  name: "core/heading",
  label: "Heading",
  category: "content",
  props: {
    text: {
      type: "string",
      required: true
    }
  },
  bindings: {
    title: {
      source: "content",
      path: "title"
    }
  }
});
```

## Props

Supported prop types:

```txt
array
boolean
number
object
string
```

Props can define `required`, `default`, and `label`.

## Data Bindings

Bindings let a block read from build context without hard-coding WordPress or WooCommerce calls.

Supported sources:

```txt
content
graph
route
site
theme
```

Example:

```js
bindings: {
  price: {
    source: "content",
    path: "data.price",
    fallback: null
  }
}
```

## Core Commerce Blocks

Phase 23 includes these starter blocks:

| Block | Purpose |
| --- | --- |
| `core/heading` | Static heading text |
| `core/content-text` | Bound content description |
| `commerce/product-price` | Bound product price |
| `commerce/archive-links` | Bound archive/category links |

The Basic Shop homepage keeps visible category links so public routes remain easy to click while later phases wire block schemas into layout JSON and the visual renderer.

Public links still follow the WPSC URL contract: `domain/slug`.
