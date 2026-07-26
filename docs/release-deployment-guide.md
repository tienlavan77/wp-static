# WPSC Release Deployment Guide

## Purpose

This guide explains how to deploy a WPSC release package to a real production domain.

It is written for the product release flow introduced in Sprint 5:

```text
Build release package
-> Upload release directory
-> Point web server
-> Open /install
-> Complete installation
-> Website ready
```

## Deployment Modes

WPSC supports two release deployment modes.

| Mode | Use When | Build During Install |
| --- | --- | --- |
| `vps` | You control the server and can run Node.js | Supported |
| `shared-hosting` | Hosting only serves PHP/static files | Requires Node support or prebuilt output |

Use `vps` for the first production deployment whenever possible.

## Build The Release Package

From the WPSC project root:

```bash
node src/cli/index.js release build \
  --project examples/basic-shop \
  --output-dir release/tinsinhphat \
  --package-name tinsinhphat \
  --mode vps \
  --clean
```

For JSON output:

```bash
node src/cli/index.js release build \
  --project examples/basic-shop \
  --output-dir release/tinsinhphat \
  --package-name tinsinhphat \
  --mode vps \
  --clean \
  --json
```

The release directory includes:

```text
release/
├── public/
├── themes/
├── plugins/
├── storage/
├── config/
├── installer/
├── vendor/
├── index.php
└── release-manifest.json
```

## Upload To VPS

Example target:

```text
/home/data/sites/wp-static
```

Upload with rsync:

```bash
rsync -av --delete release/tinsinhphat/ tienlavan@192.168.1.181:/home/data/sites/wp-static/
```

Set writable directories:

```bash
ssh tienlavan@192.168.1.181
cd /home/data/sites/wp-static
mkdir -p config storage/cache storage/logs storage/reports public
chmod -R u+rwX config storage public
```

## Nginx Example

For a VPS installation, point the domain root to the release directory and keep static routing flat.

```nginx
server {
    listen 80;
    server_name example.com www.example.com;

    root /home/data/sites/wp-static/public;
    index index.html index.php;

    location / {
        try_files $uri $uri.html $uri/ /index.html;
    }

    location /install {
        root /home/data/sites/wp-static;
        try_files $uri /index.php?$query_string;
    }

    location ~ \.php$ {
        root /home/data/sites/wp-static;
        include snippets/fastcgi-php.conf;
        fastcgi_pass unix:/run/php/php8.3-fpm.sock;
    }

    location ~ ^/(config|storage|vendor|themes|plugins)/ {
        deny all;
    }
}
```

Validate and reload:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## Open The Installer

Open:

```text
https://example.com/install
```

The installer should:

- check the environment
- connect to WordPress
- verify WooCommerce when enabled
- write `config/project.json`
- write `config/runtime.json`
- run the production build
- create the installation report
- create `config/install.lock`

After the lock exists, opening `/install` again should show the already-installed screen.

## Required Production Secrets

Set secrets on the server. Do not commit them into the release package.

Typical values:

```bash
export WORDPRESS_URL="https://api.example.com"
export WOOCOMMERCE_URL="https://api.example.com"
export WOOCOMMERCE_CONSUMER_KEY="ck_..."
export WOOCOMMERCE_CONSUMER_SECRET="cs_..."
export WPSC_RUNTIME_SECRET="long-random-secret"
export WPSC_WEBHOOK_SECRET="long-random-secret"
```

If the hosting stack uses `.env`, keep it outside public web access.

## Post Install Checklist

After installation:

- open the home page
- open one product category
- open one product detail route
- test cart and checkout flow
- test account login when runtime API is enabled
- verify `/install` is locked
- verify `storage/reports/install-report.md`
- verify `release-manifest.json`
- verify Nginx denies `config/`, `storage/`, `vendor/`, `themes/`, and `plugins/`

## Shared Hosting Notes

Shared hosting can serve the generated static output, but it may not support production build execution during browser installation.

For shared hosting:

1. Build locally or on a VPS.
2. Upload the generated release package and public output.
3. Only enable browser installation if Node.js is available.

Do not promise runtime build support unless the host can run Node.js.

## Rollback

Before replacing a production release:

```bash
cp -a /home/data/sites/wp-static /home/data/sites/wp-static.backup.$(date +%Y%m%d%H%M%S)
```

To rollback, point Nginx back to the backup directory or restore the previous release.

## Troubleshooting

| Problem | Check |
| --- | --- |
| `/install` returns 404 | Nginx root and PHP route for `/install` |
| Installer cannot write config | Permissions on `config/` |
| Build cannot write output | Permissions on `public/` and `storage/` |
| WooCommerce returns 401 | Woo consumer key and secret |
| `/install` still opens after install | Missing `config/install.lock` |
| Static routes return 404 | `try_files $uri $uri.html $uri/ /index.html` |
