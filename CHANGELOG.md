# Changelog

## 0.1.0

- Added architecture draft for WPSC Mini Core.
- Initialized the ESM Node.js package.
- Added the Basic Shop example.
- Added immutable Content models.
- Added mock adapter, router, renderer, compiler, builder, and CLI example build.
- Added focused tests for shared utilities and routing.
- Split the CLI entry from the library API entry.
- Added `wpsc build --project <project-dir>` CLI behavior.
- Added config loader, public asset copying, styled Basic Shop output, project template creation, WordPress adapter draft, Nginx deployment notes, and CLI smoke tests.
- Removed trailing slashes from public slug routes.
- Added config validation, build summaries, clean, doctor, and static serve commands.
- Added typed WPSC errors, quiet/verbose logging, normalized config paths, build manifests, pipeline integration tests, and public API draft docs.
- Expanded the WordPress adapter draft with paginated collection fetching, pages/posts/CPT repository support, ACF fields, embedded media/terms, and Rank Math SEO normalization.
- Added a WooCommerce adapter draft with paginated product fetching, categories, tags, variations, product normalization, and Rank Math product SEO normalization.
- Added a unified content graph with content, term, media, and menu lookup services.
- Added SEO output rendering for metadata, canonical, robots, Open Graph, Twitter Cards, sitemap.xml, and robots.txt.
- Added a theme resolver with content type layouts, fallback layout, components, theme metadata, and theme asset copying.
- Added a remote image asset pipeline with download cache, HTML URL rewriting, and asset manifests.
- Added a dev server workflow with watch targets, rebuild support, and live reload injection.
- Added a plugin system with data, route, render, and build hooks.
- Prepared v0.1.0 workspace package boundaries and getting started documentation.
- Added real source auth support for WordPress and WooCommerce using environment-backed credentials.
- Added preview build safety with draft/private filtering and token guarded preview builds.
- Added customer auth strategy contracts for static/runtime boundaries and frontend secret safety.
- Added a runtime commerce API scaffold with session-backed cart, checkout proxy, and order lookup handlers.
- Added customer account UI helpers for login, logout, dashboard, orders, and addresses.
- Added taxonomy archive route generation, archive pagination, and sitemap coverage for category/tag/product archives using the `domain/slug` URL contract.
- Added a guarded webhook rebuild receiver, source event normalization, rebuild queue, and validation report.
- Added incremental build planning with route dependency tracking, changed item parsing, input hashes, and affected page writes.

Status: Mini core prototype complete, architecture remains `DRAFT`.
