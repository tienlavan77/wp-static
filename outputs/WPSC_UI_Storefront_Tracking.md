# WPSC UI Storefront Tracking

Last updated: 2026-07-06

## Goal

Build the storefront UI safely on a single demo route before applying it to the real site layouts.

Demo URL:

```text
http://tinsinhphat.local/ui-storefront-demo
```

Incremental build command:

```bash
npm run build:css:example
node src/cli/index.js build --project examples/basic-shop --changed page:ui-storefront-demo
```

Expected build result while designing the demo page:

```text
Pages: 1
Incremental: /ui-storefront-demo
Remote assets downloaded: 0
```

## Rules

- Keep public URLs flat: `/slug`.
- Do not add trailing slash.
- Do not apply header/footer globally until the demo is approved.
- Design and review on `/ui-storefront-demo` first.
- Build only the demo route while iterating UI.
- Full build is only needed when changing global shell, renderer, shared layouts, or production rollout.
- Do not overwrite VPS `.env` or the real `examples/basic-shop/wpsc.config.js`.
- Do not push GitHub after each phase; push only when requested or at end of session.

## Completed UI Commits

| Commit | Status | Summary |
| --- | --- | --- |
| `476bdfc` | Done | Added Tailwind storefront CSS pipeline. |
| `5f8ca60` | Done | Invalidated route HTML cache when renderer shell changes. |
| `4d7e378` | Done | Added single-route storefront UI demo. |
| `1647787` | Done | Limited incremental asset processing to changed pages. |
| `9af5ff5` | Done | Added flat-route taxonomy breadcrumbs. |
| `ca7735e` | Done | Refined storefront shell demo header, hero, metrics, and footer. |

## Current Demo Page

Route:

```text
/ui-storefront-demo
```

Current sections:

- Demo-only storefront header.
- Brand block for Tin Sinh Phat.
- Search bar.
- CTA buttons.
- Horizontal category nav.
- Hero copy.
- Build/status signal cards.
- Storefront shell metrics panel.
- Demo footer columns.

Current verification:

```text
Local tests: 126/126 pass
VPS demo route: 200 text/html
VPS CSS: 200 text/css
VPS incremental build: Pages: 1
VPS remote assets downloaded: 0
```

## Next Phases

### UI-03A: Header Demo Polish

Planned commit:

```text
feat(theme): polish storefront header demo
```

Tasks:

- Improve desktop header density.
- Add mobile-friendly stacked header behavior.
- Add compact utility row for hotline/Zalo/contact.
- Keep search visible and easy to scan.
- Keep dark mode readable.
- Build only `/ui-storefront-demo`.

### UI-03B: Footer Demo Polish

Planned commit:

```text
feat(theme): polish storefront footer demo
```

Tasks:

- Add richer footer columns.
- Prepare placeholders for company data.
- Add policy/category/contact sections.
- Keep footer compact and B2B-oriented.
- Build only `/ui-storefront-demo`.

### UI-03C: Breadcrumb Demo Component

Planned commit:

```text
feat(theme): add storefront breadcrumb demo
```

Tasks:

- Render breadcrumb from `graph.breadcrumbs`.
- Add fallback demo breadcrumb for `/ui-storefront-demo`.
- Prepare component for product/category layouts.
- Keep URLs flat.
- Build only `/ui-storefront-demo`.

### UI-04: Product Category Demo

Planned commit:

```text
feat(theme): add product category demo layout
```

Tasks:

- Add demo category header.
- Add sidebar category tree placeholder.
- Add product grid/card pattern.
- Add count/sort/filter shell.
- Decide whether to create a second demo route or reuse `/ui-storefront-demo`.

### UI-05: Product Detail Demo

Planned commit:

```text
feat(theme): add product detail demo layout
```

Tasks:

- Add gallery pattern.
- Add product purchase panel.
- Add variant selector UI.
- Add description/spec/related sections.
- Keep variants on parent product only.

### UI-06: Apply Approved Shell To Real Layouts

Planned commit:

```text
feat(theme): apply storefront shell to site layouts
```

Tasks:

- Move approved demo header/footer into shared theme helpers.
- Apply to page/product/archive layouts.
- Run full build because header/footer becomes global.
- Verify homepage, product, category, post/page, dark mode.

## VPS Notes

Project path:

```text
/home/data/sites/wp-static
```

Useful VPS command:

```bash
cd /home/data/sites/wp-static
source ~/.nvm/nvm.sh
npm run build:css:example
node src/cli/index.js build --project examples/basic-shop --changed page:ui-storefront-demo
```

Browser check:

```text
http://tinsinhphat.local/ui-storefront-demo
```

## Open Decisions

- Whether to keep only one UI demo route or create separate demo routes for category/product.
- Exact brand colors after visual review.
- Header utility row content: hotline, Zalo, email, address, or account/cart.
- When to promote demo header/footer into global layouts.
