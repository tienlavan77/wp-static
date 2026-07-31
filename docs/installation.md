# WPSC Installation Guide

This guide describes the Sprint 1 installation path for a new WPSC project.

## Requirements

| Requirement | Minimum |
| --- | --- |
| Node.js | 20+ |
| WordPress REST API | Reachable for real WordPress sources |
| WooCommerce REST API | Reachable for commerce projects |
| Output directory | Writable by the build user |

## Quick Start From This Repository

Run commands from the WPSC repository root:

```bash
node framework/src/cli/index.js doctor
node framework/src/cli/index.js create my-shop --template commerce
node framework/src/cli/index.js validate --project my-shop
node framework/src/cli/index.js build --project my-shop
node framework/src/cli/index.js serve --project my-shop --port 8080
```

Then open:

```text
http://localhost:8080
```

## Starter Templates

List available templates:

```bash
node framework/src/cli/index.js create --list-templates
```

Available templates:

| Template | Use Case |
| --- | --- |
| `commerce` | Storefront with product content. |
| `catalog` | Product catalog without checkout assumptions. |
| `blog` | Post/content publishing. |
| `corporate` | Company pages and landing pages. |
| `blank` | Minimal static starter. |

Create a project:

```bash
node framework/src/cli/index.js create my-catalog --template catalog
```

The default template is:

```text
commerce
```

## Install Wizard

Use the install wizard when you want WPSC to generate project configuration files:

```bash
node framework/src/cli/index.js install \
  --project my-shop \
  --wordpress-url https://api.example.com \
  --woocommerce-url https://api.example.com \
  --domain https://www.example.com \
  --output-dir ./dist \
  --site-name "Example Shop"
```

Generated files:

```text
.env
wpsc.config.js
runtime.config.js
theme/layout.js
theme/components/index.js
theme/assets/.gitkeep
public/.gitkeep
install-report.md
```

Use `--force` only when you intentionally want to overwrite generated install files:

```bash
node framework/src/cli/index.js install --project my-shop --force
```

## Installation Report

By default, install creates:

```text
install-report.md
```

Choose another path:

```bash
node framework/src/cli/index.js install --project my-shop --report reports/install.md
```

The report includes:

- Project settings
- WordPress and WooCommerce URLs
- Output directory
- Theme
- Detected Node.js/platform info
- Generated files
- Warnings
- Errors
- Next steps

## Configure Real WordPress And WooCommerce

After running install, edit:

```text
my-shop/.env
```

Typical values:

```env
WPSC_SITE_URL=https://www.example.com
WPSC_WP_URL=https://api.example.com
WPSC_WOO_URL=https://api.example.com
WPSC_WOO_CONSUMER_KEY=ck_replace_me
WPSC_WOO_CONSUMER_SECRET=cs_replace_me
WPSC_RUNTIME_PORT=8787
WPSC_SESSION_SECRET=replace-with-a-long-secret
WPSC_AUTH_BRIDGE_SECRET=replace-with-a-long-secret
WPSC_AUTH_ENDPOINT=/wp-json/wpsc/v1/auth/login
```

Keep `.env` private.

## Validate Before Build

Run:

```bash
node framework/src/cli/index.js validate --project my-shop
```

For machine-readable output:

```bash
node framework/src/cli/index.js validate --project my-shop --json
```

Validation checks:

- Config syntax
- Adapter
- Theme
- Runtime configuration
- Homepage route
- Output directory
- Build output

## Doctor

Run:

```bash
node framework/src/cli/index.js doctor --project my-shop
```

For JSON output:

```bash
node framework/src/cli/index.js doctor --project my-shop --json
```

Doctor is for environment diagnostics. Validate is for project configuration.

## Build

Run:

```bash
node framework/src/cli/index.js build --project my-shop
```

Output goes to the configured `outputDir`, usually:

```text
my-shop/dist
```

## Serve Static Output

Run:

```bash
node framework/src/cli/index.js serve --project my-shop --port 8080
```

## Current Packaging Note

Sprint 1 adds the scaffold engine and `wpsc create` command. The standalone
`npx create-wpsc` packaging entrypoint should call the same scaffold engine once
package metadata is finalized.

Until then, use:

```bash
node framework/src/cli/index.js create my-shop --template commerce
```
