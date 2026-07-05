# S3 And R2 Deploy

WPSC output can be uploaded to object storage because the build result is static HTML, CSS, JS, and assets.

Typical flow:

```bash
node src/cli/index.js build --project examples/basic-shop
aws s3 sync examples/basic-shop/dist s3://your-bucket --delete
```

For Cloudflare R2, use an S3-compatible client with your R2 endpoint:

```bash
aws s3 sync examples/basic-shop/dist s3://your-r2-bucket \
  --delete \
  --endpoint-url https://<account-id>.r2.cloudflarestorage.com
```

Set cache headers at the CDN/object-storage layer. HTML should have short cache or revalidation; hashed assets can use longer cache.
