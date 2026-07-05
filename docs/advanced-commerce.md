# Advanced Commerce

Phase 29 adds static commerce data helpers for larger shops.

## Variant Pages

Products can include `data.variants`. Each variant becomes a static `product_variant` content item.

Example route:

```text
/iphone-15-128gb-den
```

Variant routes keep the project URL contract: `domain/slug`, no trailing slash.

## Sale And Stock Filters

`createCommerceCollections(products)` creates:

- `commerce.products.onSale`
- `commerce.products.inStock`
- `commerce.products.outOfStock`

Sale products are detected when `salePrice` is lower than `regularPrice` or `price`.

## Related Products

`addRelatedProducts(contents)` adds `data.relatedProductIds` to product content by matching taxonomy terms. Variant content is excluded from related product scoring so product recommendations stay focused on parent products.

## Compile Integration

`compile()` runs `applyAdvancedCommerceData()` after data plugins and before graph/routes. This means variant content, commerce filters, and related product IDs are available to themes, builder blocks, sitemap, and route generation.
