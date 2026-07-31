# Cloudflare Pages Deploy

Cloudflare Pages works well for static WPSC output.

Recommended settings:

- Build command: `npm run build:example` or `node framework/src/cli/index.js build --project <project-dir>`
- Output directory: `<project-dir>/dist`
- Node.js: `>=20`

For the Basic Shop example:

```text
Build command: npm run build:example
Output directory: fixtures/basic-shop/dist
```

Use environment variables for real WordPress/WooCommerce credentials and never commit them into the repo.

For webhook rebuilds, use Cloudflare Pages deploy hooks or a GitHub Actions workflow that runs the build command after WordPress publishes content.
