# Visual Builder Responsive Settings

Every layout node can include a `responsive` object. Phase 24 stores this data only; Phase 25+ can decide how to render it as classes, attributes, or inline styles.

Supported breakpoints:

- `mobile`
- `tablet`
- `desktop`

Example:

```json
{
  "id": "product-grid",
  "type": "section",
  "responsive": {
    "mobile": {
      "columns": 1,
      "gap": "16px"
    },
    "tablet": {
      "columns": 2,
      "gap": "20px"
    },
    "desktop": {
      "columns": 4,
      "gap": "24px"
    }
  },
  "children": []
}
```

The model validates breakpoint names and keeps settings JSON serializable. This keeps saved builder documents portable across local builds, VPS builds, and future admin UI storage.
