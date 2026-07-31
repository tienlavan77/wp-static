# WPSC CLI Reference

## Common Commands

```bash
node framework/src/cli/index.js --help
node framework/src/cli/index.js --version
node framework/src/cli/index.js doctor --project <project-dir>
node framework/src/cli/index.js validate --project <project-dir>
node framework/src/cli/index.js install --project <project-dir>
node framework/src/cli/index.js create <project-name> --template commerce
node framework/src/cli/index.js build --project <project-dir>
node framework/src/cli/index.js serve --project <project-dir> --port 8080
```

## `doctor`

```bash
node framework/src/cli/index.js doctor --project <project-dir> [--json]
```

Checks environment and project diagnostics.

## `validate`

```bash
node framework/src/cli/index.js validate --project <project-dir> [--json]
```

Checks config, adapter, theme, runtime config, route, output, and build settings.

## `install`

```bash
node framework/src/cli/index.js install \
  --project <project-dir> \
  --wordpress-url <url> \
  --woocommerce-url <url> \
  --domain <url> \
  --output-dir <dir> \
  --site-name <name> \
  --theme <name> \
  --report <path> \
  --force \
  --json
```

Generates project configuration files and an installation report.

## `create`

```bash
node framework/src/cli/index.js create <project-name> --template <template>
node framework/src/cli/index.js create --list-templates
```

Supported templates:

```text
blank
blog
catalog
commerce
corporate
```

## `build`

```bash
node framework/src/cli/index.js build --project <project-dir>
```

Builds static output.

## `serve`

```bash
node framework/src/cli/index.js serve --project <project-dir> --port 8080
```

Serves the configured output directory.

## `webhook`

```bash
node framework/src/cli/index.js webhook --project <project-dir> --port 8787 --secret <secret>
```

Starts the local webhook receiver for rebuild requests.
