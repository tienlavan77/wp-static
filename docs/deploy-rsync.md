# Rsync Deploy

Use rsync when you deploy to a VPS that serves the built `dist` directory with Nginx.

```bash
node framework/src/cli/index.js deploy rsync \
  --project fixtures/basic-shop \
  --target tienlavan@192.168.1.181:/home/data/sites/wp-static/fixtures/basic-shop/dist/
```

Dry run first:

```bash
node framework/src/cli/index.js deploy rsync \
  --project fixtures/basic-shop \
  --target tienlavan@192.168.1.181:/home/data/sites/wp-static/fixtures/basic-shop/dist/ \
  --dry-run
```

The command builds the project first, then syncs the output with:

- `rsync -avz`
- `--delete`
- excludes `.DS_Store`
- excludes `.wpsc/cache`

Keep the target pointed at the public web root, not the source project directory.
