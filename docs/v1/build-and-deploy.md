# Build And Deploy

Status: stable in WPSC v1.0.

## Local Build

```sh
npm run build:example
```

The build writes static output to the project `dist` directory.

## Incremental Build

Use the webhook workflow to rebuild only changed content and related routes. Public routes
keep the v1 URL rule:

```text
domain/slug
```

There is no trailing slash requirement and no public taxonomy base.

## Deployment Targets

WPSC v1 includes docs and helpers for:

- rsync to a VPS.
- Nginx static hosting.
- Cloudflare Pages.
- S3 or R2 compatible object storage.
- GitHub Actions deployment.
