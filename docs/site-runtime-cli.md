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
On the first Site, it also creates a runnable `runtime.config.js` using the
local `demo` adapter. The command never overwrites an existing Runtime config.

## Configure the Runtime Service

`site:create` creates `runtime.config.js` for the first Site. The file is
executable JavaScript because source adapters are injected dependencies. Theme
selection belongs to the Runtime Builder V1 configuration, not this file.
Replace its local demo adapter when connecting a real provider:

```js
export default {
  adapterLoader: {
    load(sourceType, options) {
      // Return a contract-valid adapter for sourceType.
    }
  },
  webhookBaseUrl: "https://example.test/webhook"
};
```

`adapterLoader` and `webhookBaseUrl` are required. Domain
mappings may optionally be supplied as `domains` in this file; they override
same-name entries in `config/runtime-sites.json`. Customer Source credentials
are entered only through Browser Setup and persisted privately per Site.

## Start Node Runtime

```sh
wpsc runtime:serve --config runtime.config.js --port 8787
```

Set `WPSC_RUNTIME_ORIGIN=http://127.0.0.1:8787` for PHP-FPM/Apache and set the
domain document root to `sites/company-a/public/`. Opening `example.test` then
reaches Installer. After setup, Source registration, Webhook registration, and
First Build, generated pages are served from `sites/company-a/public/dist/`.
