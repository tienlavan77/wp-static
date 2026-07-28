# Site Runtime CLI

## Create a Site Skeleton

```sh
wpsc site:create --site company-a --domain example.test
```

The command calls Provisioning Service and creates:

```text
sites/company-a/
  config/site.json
  public/index.php
  public/dist/
```

It also persists the domain mapping in `config/runtime-sites.json`. This mapping
is read by `runtime:serve`; it is operational configuration, not Setup workflow.

## Configure the Runtime Service

Create `runtime.config.js` in the workspace. The file is executable JavaScript
because adapters, readers, and themes are injected dependencies:

```js
import { createThemeRenderer } from "wpsc";

export default {
  adapterLoader: {
    load(sourceType, options) {
      // Return a contract-valid adapter for sourceType.
    }
  },
  contentReader: {
    async read({ siteId }) {
      return { assets: [], items: [] };
    }
  },
  themeRenderer: createThemeRenderer({
    defaultLayout: ({ content, html }) => html`<main>${content.title}</main>`
  }),
  webhookBaseUrl: "https://example.test/webhook"
};
```

`adapterLoader`, `contentReader`, `themeRenderer`, and `webhookBaseUrl` are
required. Domain mappings may optionally be supplied as `domains` in this file;
they override same-name entries in `config/runtime-sites.json`.

## Start Node Runtime

```sh
wpsc runtime:serve --config runtime.config.js --port 8787
```

Set `WPSC_RUNTIME_ORIGIN=http://127.0.0.1:8787` for PHP-FPM/Apache and set the
domain document root to `sites/company-a/public/`. Opening `example.test` then
reaches Installer. After setup, Source registration, Webhook registration, and
First Build, generated pages are served from `sites/company-a/public/dist/`.
