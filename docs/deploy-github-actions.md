# GitHub Actions Deploy

This workflow builds WPSC and uploads the static output as an artifact. You can extend the final step to rsync, S3, R2, or Cloudflare Pages.

```yaml
name: Build WPSC

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npm test
      - run: npm run build:example
      - uses: actions/upload-artifact@v4
        with:
          name: basic-shop-dist
          path: examples/basic-shop/dist
```

For real sources, add WordPress/WooCommerce credentials as repository secrets and map them to environment variables in the build step.
