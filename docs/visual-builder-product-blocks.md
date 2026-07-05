# Visual Builder Product Blocks

Product layouts target the `product` content type:

```json
{
  "id": "product-default",
  "contentTypes": ["product"],
  "sections": []
}
```

Commerce product blocks read normalized product fields from `content.data`. The first supported product block is `commerce/product-price`, which reads `data.price` and formats it as VND unless another currency prop is provided.

The renderer also exposes `context.product` for future blocks that need richer product state from the content graph.
