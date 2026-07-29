# WPSC Current Project Directory Structure

Date: 2026-07-29
Scope: current workspace after Sprint 6 freeze and Runtime productization work.

## Workspace Mapping

```text
Local workspace
/Users/tienlavan/Documents/wpstatic

Mapped Runtime workspace
/home/data/sites/wp-static
```

Code is edited in the workspace path above. The VPS mapping sees the same project files. Runtime commands are run on the VPS only when a service must be started, a Site must be built, or production behavior must be validated.

## Ownership Legend

| Marker | Meaning |
| --- | --- |
| `[source]` | Hand-written Framework, Theme, integration, documentation or test source. |
| `[generated]` | Build/runtime artifact. Do not edit; rebuild it. |
| `[private]` | Environment or Site credential data. Do not commit or expose. |
| `[fixture]` | Test/example input or expected output. |

## Top-Level Tree

```text
wpstatic/
|
|- src/                         [source] WPSC Framework implementation
|- test/                        [source] Node test suite and fixtures
|- themes/                      [source] Shared WPSC themes
|- integrations/                [source] Installable external-system bridges
|- sites/                       [runtime] Isolated Site Runtime instances
|- config/                      [private] Local/Runtime environment configuration
|- runtime.config.js            [source] Runtime composition configuration
|
|- docs/                        [source] Product, architecture and contract docs
|- outputs/                     [source] Sprint plans, audits and delivery reports
|- examples/                    [fixture] Example projects and their generated output
|- templates/                   [source] Reusable project/release templates
|- plugins/                     [source] WPSC plugin packages
|- packages/                    [source] Package-level modules
|- scripts/                     [source] Development and release scripts
|- cli/                         [source] CLI-facing assets/helpers
|
|- framework/                   [source] Framework-facing project material
|- dashboard/                   [source] Dashboard-facing project material
|- setup/                       [source] Setup-facing project material
|- sources/                     [source] Source/provider project material
|- storage/                     [runtime] Shared local storage area
|- work/                        [generated/local] Scratch work area; ignored by Git
|- rfcs/                        [source] Architecture proposals and RFCs
|
|- package.json                 [source] Node package manifest
|- package-lock.json            [source] Locked Node dependency graph
|- README.md                    [source] Project entry documentation
|- CHANGELOG.md                 [source] Release history
`- .gitignore                  [source] Generated/private file policy
```

## Framework Source: `src/`

`src/` is the WPSC v2 source of truth. It is grouped by domain ownership rather than by Browser or CLI screen.

```text
src/
|
|- site/                        Site metadata, lifecycle, repository and isolation
|- provision/                   Provisioning plans, transactions and rollback
|- setup/                       Shared Setup Service and workflow support
|- source/                      Source adapters, registry and credential store
|- adapters/
|  |- wordpress/                WordPress normalization
|  |- woocommerce/              WooCommerce normalization
|  `- wordpressWooCommerce/     Combined source adaptation
|
|- runtime/                     Dynamic Site Runtime
|  |- account/                  Customer account API handlers/views
|  |- api/                      Runtime API utilities
|  |- auth/                     Runtime customer authentication handlers
|  |- cart/                     Runtime cart APIs
|  |- checkout/                 Runtime checkout APIs
|  |- commerce/                 Session, WordPress Auth and Woo account services
|  |- frontend/                 Browser runtime helpers
|  |- order/                    Runtime order APIs
|  |- session/                  Session exports/helpers
|  |- createSiteRuntime.js      PHP front-controller template and Site runtime shell
|  |- createSiteRuntimeInstance.js
|  |- createRuntimeRouter.js
|  |- createRuntimeHttpServer.js
|  |- createRuntimeV1Builder.js
|  |- createSharedStorefrontBuildConfig.js
|  |- createRuntimeSystemContents.js
|  |- createSiteCommerceGateway.js
|  `- enhanced-navigation.js
|
|- scheduler/                   Scheduler policy, Queue, Dispatcher and job contracts
|- build/                       Build Engine and Build Integration orchestrator
|- builder/                     Builder V1 output build, manifests and public assets
|- core/                        Compiler, configuration and shared Framework composition
|- content/                     Content pipeline and content model processing
|- graph/                       Content graph construction
|- router/                      Static route planning
|- templates/                   Template resolution and template manifest
|- renderer/                    Theme renderer boundary
|- output/                      Output publishing boundary
|- assets/                      Remote asset download, cache and URL rewrite pipeline
|- data/                        Route data and normalized content-store output
|- fragments/                   SPA fragment output
|- search/                      Search index output
|- seo/                         Sitemap, robots and SEO output
|- incremental/                 Changed-route planning
|- plugins/                     Plugin hook system
|
|- browser/                     Browser gateway/view source only
|- cli/                         CLI commands and command composition
|- installer/                   Installer service support
|- dashboard/                   Dashboard service support
|- api/                         REST/API support
|- webhook/                     Webhook infrastructure
|- queue/                       Queue support modules
|- validation/                  Shared validation utilities
|- shared/                      Shared pure utilities and contracts
|
`- admin/, auth/, blocks/, cache/, commerce/, deploy/, dev-server/, invalidate/
   performance/, planner/, preview/, progress/, release/, report/, taxonomy/
   theme/, visual-builder/, watcher/
                               Additional Framework subsystems
```

### Important Source Boundaries

```text
Browser/CLI
    -> src/runtime or src/setup gateways
    -> src/setup / src/scheduler / src/build domain services
    -> src/builder (Builder V1 static-output semantics)
    -> src/output (only filesystem publisher)
```

- `src/runtime/` owns dynamic APIs, HTTP-only customer sessions and Runtime composition.
- `src/builder/` owns Builder V1 static build behavior: templates, assets, route data, fragments, search, SEO and manifests.
- `src/output/` is the only Framework layer that publishes a Site output directory.
- `src/scheduler/` is the single entry for Browser, CLI and webhook build requests.

## Shared Theme: `themes/storefront/`

```text
themes/storefront/              [source]
|
|- layout.js                    Root Storefront theme shell
|- blocks.js                    Theme block definitions
|- layouts/
|  |- page.js                   Standard page layout
|  |- product.js                Product layout and variation UI
|  |- archive.js                Product taxonomy/archive layout
|  |- account.js                Customer Account layout shell
|  `- search.js                 Search layout
|
|- components/
|  |- account/                  Account shell component
|  |- archive/                  Archive description, toolbar and pagination
|  |- category/                 Category cards/grids
|  |- commerce/                 Cart and checkout components
|  |- footer/                   Footer components
|  |- header/                   Header components
|  |- navigation/               Breadcrumb and navigation components
|  |- product/                  Product cards, gallery, variants and detail panels
|  |- sections/                 Shared storefront sections
|  `- shared/                   Escaping, formatting and image helpers
|
|- assets/theme.css             Theme CSS source
|- storefront.css               Theme CSS source
|- storefront.compiled.css      Compiled theme CSS source artifact
|- public/storefront.css        CSS copied by Builder V1 into Site output
`- wpsc.real.config.js          Shared Runtime Builder V1 theme configuration
```

`themes/storefront/public/storefront.css` is source controlled Theme public input. It is copied to the generated Site output during a build; editing `sites/<site>/public/dist/storefront.css` directly is incorrect.

## WordPress Integrations: `integrations/wordpress/`

```text
integrations/wordpress/         [source]
|
|- wpsc-webhook-bridge/
|  |- wpsc-webhook-bridge.php   Webhook registration, delivery and verification bridge
|  `- README.md
|
|- wpsc-auth-bridge/
|  |- wpsc-auth-bridge.php      Customer authentication bridge endpoints
|  `- README.md
|
`- wpsc-zoho-mail-bridge/
   |- wpsc-zoho-mail-bridge.php Transactional mail transport bridge
   `- README.md
```

The bridges deliberately retain separate responsibilities and secrets:

```text
WPSC_WEBHOOK_SECRET       -> webhook trust boundary
WPSC_AUTH_BRIDGE_SECRET   -> customer authentication trust boundary
WPSC_ZOHO_SMTP_SECRET     -> mail transport trust boundary
```

## Site Runtime Instances: `sites/`

Each Site is isolated below `sites/<site-id>/`.

```text
sites/
`- tinsinhphat/                 [runtime] Current real Site Runtime
   |
   |- config/                   [private]
   |  |- site.json              Site metadata/lifecycle state
   |  |- runtime.json           Runtime setup snapshot
   |  |- source.json            Persisted non-secret source metadata
   |  |- source-credentials.json
   |  |- webhook.json
   |  `- build.json
   |
   |- public/
   |  |- index.php              Runtime PHP front controller
   |  `- dist/                  [generated] Published Builder V1 output
   |     |- index.html
   |     |- <route>/index.html  Generated static Site pages
   |     |- assets/media/       Downloaded/published media assets
   |     |- data/               Route data, content store and manifests
   |     |- fragments/          SPA main-content fragments
   |     |- frontend/           Runtime browser helper modules
   |     |- theme/              Copied Theme public files
   |     |- .wpsc/              Build, asset and template manifests
   |     |- storefront.css
   |     `- wpsc-enhanced-navigation.js
   |
   |- storage/                  [generated/runtime]
   |  |- cache/assets/          Downloaded asset cache
   |  |- sessions/              Runtime session storage location
   |  |- logs/                  Runtime logs
   |  |- tmp/                   Per-build staging directories
   |  `- reset-backup-*/        Explicit runtime reset backups
   |
   |- plugins/                  Site-specific future plugin overrides
   `- themes/                   Site-specific future theme overrides
```

### Site Runtime File Rules

- `config/source-credentials.json` is private; never include it in documentation, Git commits or browser responses.
- `public/index.php` is source-like Runtime entry code generated from `src/runtime/createSiteRuntime.js`; update the template and regenerate/update the Site entry together.
- `public/dist/` is generated. It is replaced by `runtime:build`; never manually repair individual generated routes or assets.
- `storage/cache/`, `storage/tmp/` and `storage/sessions/` are runtime state, not Framework source.
- Runtime Build and Runtime service output are owned by `www-data`.

## Runtime Configuration: `config/` And Root Files

```text
config/                         [private]
|- runtime.env                  Runtime environment values and bridge secret
`- runtime-wordpress.env        Legacy fallback environment file

runtime.config.js               [source]
runtime.config.js.backup-*      [local backup] Configuration backup created during setup
```

`config/runtime.env` is intentionally ignored by Git. It may contain `WPSC_AUTH_BRIDGE_SECRET` and must never be copied into source documentation or commits.

## Documentation And Delivery Records

```text
docs/                           [source]
|- contracts/                   Cross-module stable contracts
|- adr/                         Architecture Decision Records
|- roadmap/                     Deferred/release follow-up plans
|- v1/                          Builder V1 reference documentation
`- *.md                         Product, deployment and implementation guides

outputs/sprint-6/               [source delivery record]
|- Architecture-v2-01-final.md  Accepted architecture baseline
|- phase-1/ ... phase-7/        Commit plans, audits and closeout reports
|- reviews/                     Commit review records
|- sprint-6-completion-report.md
|- sprint-6-post-freeze-runtime-summary.md
`- current-project-directory-structure.md
```

`outputs/` is documentation/history, not generated application output. The generated Site output is only under `sites/<site-id>/public/dist/`.

## Tests And Examples

```text
test/                           [source]
|- fixtures/                    WordPress, WooCommerce, webhook, theme and asset fixtures
`- *.test.js                    Node tests by subsystem

examples/basic-shop/            [fixture/example]
|- wpsc.config.js               Example Builder V1 project configuration
|- theme/, layouts/, plugins/   Example customization input
|- public/                      Example public source assets
|- dist/                        [generated] Example build output
|- .wpsc/                       [generated] Example build cache/metadata
`- release/                     [generated] Example release package
```

## Generated And Ignored Paths

The following categories are generated or private and should not be edited as source:

```text
node_modules/
coverage/
dist/
work/
examples/*/dist/
examples/*/.wpsc/
examples/*/release/
sites/*/public/dist/
sites/*/storage/
config/runtime.env
config/runtime-wordpress.env
*.log
```

## Current Build And Serve Commands

Run these on the VPS mapping when validating the real Site Runtime:

```sh
cd /home/data/sites/wp-static

sudo -u www-data /usr/bin/node src/cli/index.js runtime:build \
  --site tinsinhphat \
  --config runtime.config.js \
  --project /home/data/sites/wp-static

sudo systemctl restart wpsc-runtime
```

The build command regenerates `sites/tinsinhphat/public/dist/`. The service restart is only required after Node Runtime source/config changes, not after a static-only Builder V1 output rebuild.

## Directory Decision Rule

Before adding a new file, choose the owner first:

```text
Framework business logic?       -> src/<domain>/
Shared storefront template?     -> themes/storefront/
WordPress-side integration?     -> integrations/wordpress/<bridge>/
Specific Site configuration?    -> sites/<site-id>/config/
Specific Site generated output? -> sites/<site-id>/public/dist/
Runtime temporary/cache state?  -> sites/<site-id>/storage/
Contract/documentation?         -> docs/contracts/ or outputs/sprint-6/
Test fixture?                   -> test/fixtures/
```

Do not introduce Setup, Scheduler, Build or Source business logic into Browser, CLI, Theme or WordPress bridge folders.
