# Advanced Commerce

Phase 29 adds static commerce data helpers for larger shops.

## Product Variants

Products can include `data.variants`. WooCommerce `variations` are normalized into
`data.variants` before rendering.

Variants stay inside the parent product data so customers can choose options before
adding a product to the cart. WPSC does not create standalone static routes for variants.

```text
/iphone-15
/data/routes/iphone-15.json
```

The product page and route data JSON contain the full variants array. Repeated variations
that would create the same variant slug are deduped inside the product data.

## Sale And Stock Filters

`createCommerceCollections(products)` creates:

- `commerce.products.onSale`
- `commerce.products.inStock`
- `commerce.products.outOfStock`

Sale products are detected when `salePrice` is lower than `regularPrice` or `price`.

## Related Products

`addRelatedProducts(contents)` adds `data.relatedProductIds` to product content by matching taxonomy terms. Variant content is excluded from related product scoring so product recommendations stay focused on parent products.

## Compile Integration

`compile()` runs `applyAdvancedCommerceData()` after data plugins and before graph/routes. This means parent product variant data, commerce filters, and related product IDs are available to themes, builder blocks, sitemap, and route generation.
