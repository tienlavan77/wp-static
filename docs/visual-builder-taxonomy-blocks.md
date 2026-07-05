# Visual Builder Taxonomy Blocks

Archive layouts can target taxonomy content types:

```json
{
  "id": "archive-default",
  "contentTypes": ["category", "tag", "product_cat", "product_tag"],
  "sections": []
}
```

Taxonomy/archive blocks read normalized archive data from `content.data`. The first supported archive block is `commerce/archive-links`, which reads `data.archiveLinks`.

Archive links must keep the project URL contract:

- `domain/slug`
- no taxonomy base such as `/product-category/slug`
- no trailing slash

The renderer also exposes `context.taxonomy` for future archive-specific blocks.
