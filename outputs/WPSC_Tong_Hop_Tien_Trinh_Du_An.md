# WPSC - Tổng Hợp Tiến Trình Dự Án

Ngày cập nhật: 2026-07-11

## Mục Đích

Tài liệu này tổng hợp tiến trình hiện tại của dự án WPSC sau khi đọc lại các file markdown trong repo:

- `README.md`
- `ARCHITECTURE.md`
- `CHANGELOG.md`
- `outputs/*.md`
- `docs/*.md`
- `docs/v1/*.md`
- `rfcs/*.md`
- README của các package

Tài liệu này cũng cập nhật quyết định kiến trúc mới nhất:

> WPSC Builder sẽ là công cụ xây template tĩnh cho từng loại trang, không chỉ là page builder đơn lẻ, và không render public frontend bằng runtime JavaScript.

## Tóm Tắt Hiện Trạng

WPSC đã đi từ một prototype static commerce nhỏ thành một framework static commerce có nền tảng khá đầy đủ cho WordPress/WooCommerce.

Theo tài liệu hiện có, WPSC đã có nền tảng v1.0 với các hợp đồng ổn định cho:

- Core compile/build API.
- Adapter API.
- Theme API.
- Plugin API.
- Nền tảng visual builder.
- Quy trình deploy.
- Public route data.
- Ranh giới runtime commerce.

Tuy nhiên, hướng ưu tiên mới đã thay đổi:

```text
Hướng cũ:
  Tiếp tục polish homepage/layout hard-code.

Hướng mới:
  Xây nền kiến trúc template builder để homepage, page, post, product,
  product_cat, archive... đều render từ template builder.
```

Phần storefront homepage hard-code hiện tại chỉ nên xem là bước chuyển tiếp, không phải kiến trúc cuối.

## Trạng Thái Kiểm Chứng Gần Đây

Kết quả kiểm tra trong phiên làm việc gần nhất:

```text
Local npm test: 128/128 pass
VPS npm test bằng Node 26 qua nvm: 128/128 pass
VPS real build: pass
Real site: Tin Sinh Phat
Pages: 169
Remote assets downloaded: 233
dist: 1393 files, 111M
```

Lưu ý quan trọng trên VPS:

```bash
source ~/.nvm/nvm.sh && nvm use 26.3.1
```

Mặc định SSH không interactive trên VPS đang dùng Node `v18.19.1`, trong khi project yêu cầu Node `>=20`.

## Những Gì Đã Làm Được

### 1. Core Static Pipeline

Trạng thái: `DONE`

Pipeline gốc đã được xây:

```text
CLI
-> Config
-> Adapter
-> Content
-> Router
-> Renderer
-> Builder
-> dist/*.html
```

Đã có:

- Node package dùng ESM.
- Node engine target `>=20`.
- Immutable `Content` model.
- Mock adapter.
- Route từ flat SEO slug.
- Chặn duplicate route.
- Layout render bằng JavaScript thuần.
- HTML escaping helper.
- Static HTML output.
- CLI build command.
- Basic Shop example.

### 2. Tooling Và CLI

Trạng thái: `DONE`

Đã có các lệnh/chức năng:

- `build`
- `create`
- `clean`
- `doctor`
- `serve`
- `dev`
- `--help`
- `--version`
- Build summary.
- Config loader.
- Tạo project từ template.
- Copy public assets.
- Static serve.
- Example có style để xem trên browser.

### 3. Route Và URL Contract

Trạng thái: `DONE`

Hợp đồng route đã chốt:

```text
domain/slug
```

Public URL phẳng:

```text
/                         -> homepage
/gioi-thieu               -> page
/thu-webhook-node-js      -> post
/hop-nap-cai-tsp01        -> product
/decal-giay               -> taxonomy/category archive
```

Không dùng public prefix như:

```text
/product/slug
/category/slug
/post/slug
```

Output tĩnh cũng phẳng để Nginx/CDN serve trực tiếp:

```text
dist/index.html
dist/gioi-thieu.html
dist/hop-nap-cai-tsp01.html
```

### 4. Core Hardening

Trạng thái: `DONE`

Đã có:

- Typed errors cho config/build/route/adapter.
- Quiet/verbose logging.
- Normalize config paths.
- Build manifest.
- Content manifest.
- Route manifest.
- Integration tests.
- Public API draft, sau này được đẩy lên v1 docs.

### 5. WordPress Adapter

Trạng thái: `DONE`

Đã có:

- Fetch WordPress REST collections có pagination.
- Pages và posts.
- Custom post types.
- Taxonomies và terms.
- Media library items.
- Menus.
- `_embed` data.
- Normalize ACF.
- Normalize Rank Math SEO.
- Normalize WordPress content về WPSC `Content`.
- Auth bằng env: Application Password hoặc Bearer token.

Nguyên tắc:

```text
WordPress chỉ là nguồn dữ liệu, không phải engine render frontend.
```

### 6. WooCommerce Adapter

Trạng thái: `DONE`

Đã có:

- Fetch products có pagination.
- Product categories và tags.
- Product variations.
- Price, sale price, stock, SKU.
- Product images và categories.
- Rank Math product SEO.
- Adapter kết hợp WordPress + WooCommerce.
- Credentials đọc từ env.

### 7. Unified Content Graph

Trạng thái: `DONE`

Đã có:

- Content collection model.
- Term model.
- Media model.
- Menu model.
- Relation resolver.
- Lookup theo id, slug, type, term.

Mục đích:

```text
Theme/builder đọc WPSC graph, không cần biết data đến từ WordPress hay WooCommerce.
```

### 8. SEO Output System

Trạng thái: `DONE`

Đã có:

- `<title>`
- Meta description.
- Canonical.
- Robots meta.
- Open Graph.
- Twitter Cards.
- `sitemap.xml`
- `robots.txt`
- Site fallback metadata.

SEO renderer chỉ đọc normalized WPSC SEO data, không biết trực tiếp Rank Math.

### 9. Theme System

Trạng thái: `DONE`, nhưng cần định nghĩa lại vai trò theo kiến trúc mới.

Đã có:

- Theme resolver.
- Fallback layout.
- Layout theo content type.
- Components module.
- Theme assets.
- Theme metadata.
- Theme block libraries.
- Project block overrides.

Hạn chế hiện tại:

Theme system vẫn dễ dẫn đến layout hard-code trong:

```text
theme/layouts/page.js
theme/layouts/product.js
```

Hướng mới:

```text
Theme cung cấp block/component/CSS/fallback.
Builder template mới là nơi sở hữu bố cục chính.
```

### 10. Asset Và Image Pipeline

Trạng thái: `DONE`

Đã có:

- Download remote media.
- Download cache.
- Rewrite image URL.
- Asset manifest.
- Copy theme assets.
- Asset cache stats.

### 11. Dev Server Và Watch Mode

Trạng thái: `DONE`

Đã có:

- Watch content.
- Watch theme.
- Watch config.
- Rebuild.
- Live reload injection.

### 12. Plugin System

Trạng thái: `DONE`

Stable hooks:

- `data({ contents, collections }, context)`
- `routes(routes, context)`
- `render({ route, html }, context)`
- `buildStart(payload, context)`
- `buildEnd(payload, context)`

### 13. Package Extraction

Trạng thái: `DONE`

Đã có package/workspace boundary:

- `@wpsc/shared`
- `@wpsc/core`
- `@wpsc/adapters`
- `@wpsc/router`
- `@wpsc/renderer`
- `@wpsc/builder`
- `@wpsc/cli`

`RFC-0002` đã ghi nhận hướng monorepo extraction.

### 14. Real Source Integration

Trạng thái: `DONE`

Đã có:

- Checklist cho WordPress/WooCommerce thật.
- Hỗ trợ `.env`.
- WordPress Application Password auth.
- WordPress Bearer token auth.
- WooCommerce env credentials.
- Xử lý edge case từ source thật.

### 15. Preview Và Private Data Safety

Trạng thái: `DONE`

Đã có:

- Preview build mode.
- Hỗ trợ draft/private source items.
- Preview token guard.
- Public build loại private content.

### 16. Customer Auth Strategy

Trạng thái: `DONE`

Đã chốt boundary:

- Static catalog không bắt buộc login.
- Customer/session data nằm ở runtime service nếu cần.
- Secret WordPress/WooCommerce không bao giờ được đưa ra static frontend.

Cấm đưa lên frontend:

- `WPSC_WOO_CONSUMER_SECRET`
- `WPSC_WP_APP_PASSWORD`
- `WPSC_WP_BEARER_TOKEN`
- `JWT_SIGNING_SECRET`
- `SESSION_SECRET`

### 17. Runtime Commerce API

Trạng thái: `DONE` ở mức scaffold/foundation.

Đã document endpoint:

- `GET /health`
- `GET /cart`
- `POST /cart/items`
- `DELETE /cart/items/:productId`
- `POST /checkout`
- `GET /orders/:orderId`

Boundary:

```text
Runtime commerce API là tùy chọn, tách khỏi public static rendering.
```

### 18. Customer Account UI

Trạng thái: `DONE` ở mức helper.

Đã có helper:

- `renderLoginView()`
- `renderLogoutView()`
- `renderAccountDashboard(customer)`
- `renderOrderHistoryView(orders)`
- `renderAddressBookView(addresses)`

### 19. Taxonomy Và Archive Pages

Trạng thái: `DONE`

Đã có:

- Category/tag/product category archive generation.
- Archive pagination.
- Sitemap coverage.
- Flat URL contract.
- Route data output.

### 20. Webhook Rebuild Workflow

Trạng thái: `DONE`

Đã có:

- Webhook receiver.
- Payload normalization.
- Queue guard.
- Validation report.
- Editor workflow notes.

### 21. Incremental Build Engine

Trạng thái: `DONE`

Đã có:

- Changed item parsing.
- Route dependency graph.
- Incremental build planning.
- Product thay đổi thì rebuild route của nó và archive liên quan.
- Menu/media/theme file có thể trigger rebuild rộng hơn.
- Shared outputs refresh sau incremental build.

### 22. Performance Và Cache

Trạng thái: `DONE`

Đã có:

- Content cache.
- Collection cache.
- Route render cache.
- Asset cache.
- Parallel route rendering.
- Cache stats trong build manifest.

### 23. Public Route Data

Trạng thái: `DONE`

Đã có:

- `dist/data/routes/{slug}.json`
- Route metadata.
- Site metadata.
- Public content data.
- SEO payload.
- Media/taxonomy/commerce/variant payload.
- Runtime-safe route data.

Không được chứa:

- WooCommerce consumer secrets.
- WordPress credentials.
- Customer sessions.
- Orders/account data.
- Private operational fields.

### 24. Visual Builder Foundation

Trạng thái: `DONE` ở mức foundation, nhưng cần đẩy thành kiến trúc chính.

Đã có:

- Block schema system.
- Props validation.
- Data binding schema.
- Starter commerce blocks.
- Layout JSON documents.
- Content type mapping.
- Nested section/block nodes.
- Responsive settings.
- Layout renderer.
- Content bindings.
- Commerce blocks.
- Taxonomy blocks.
- Missing-block fallback.

### 25. Builder UI Prototype

Trạng thái: `DONE` ở mức prototype.

Đã có:

- Dependency-free builder UI prototype.
- Block palette.
- Canvas ordering.
- Props editing.
- Live preview.
- JSON export/save behavior.

Blocks hiện có trong docs:

- `core/heading`
- `core/content-text`
- `commerce/product-price`
- `commerce/archive-links`

### 26. Production Builder Foundation

Trạng thái: `DONE` ở mức foundation.

Đã có:

- Editor auth.
- Layout revisions.
- Draft/published state.
- Publish flow.
- Rebuild trigger.

### 27. Advanced Commerce

Trạng thái: `DONE`

Đã có:

- Parent product variants.
- Sale/in-stock/out-of-stock collections.
- Related products.

### 28. Deployment Integrations

Trạng thái: `DONE`

Đã document deploy:

- Nginx.
- rsync to VPS.
- Cloudflare Pages.
- S3/R2.
- GitHub Actions.

### 29. API Stabilization Và v1

Trạng thái: `DONE` theo docs.

Đã có docs cho:

- API stability.
- Migration policy.
- Deprecation policy.
- v1 Adapter API.
- v1 Plugin API.
- v1 Theme API.

## UI Storefront Hiện Tại

Đã có:

- Tailwind storefront CSS pipeline.
- Storefront design token foundation.
- Demo route `/ui-storefront-demo`.
- Demo header/footer/shell.
- Homepage `/` có storefront shell hard-code.

Gần đây đã verify:

```text
Local tests: 128/128 pass
VPS real build: pass
```

Nhưng cần đánh dấu lại:

```text
Homepage hard-code hiện tại = tạm thời.
Kiến trúc cuối = builder template render homepage và mọi loại trang.
```

## Quyết Định Kiến Trúc Mới

Ý tưởng đã chốt trong trao đổi:

> Homepage và mọi loại trang cụ thể nên bắt đầu như canvas trống. Builder dùng để tạo template cho từng loại route/content: post, page, product, product_cat, taxonomy archive... Build pipeline áp template đó vào data thật và xuất file HTML tĩnh.

Pipeline mục tiêu:

```text
blank canvas
-> builder template theo loại route/content
-> bind real content/term/graph data
-> static build
-> HTML/CSS/JS/JSON trong dist
```

Public site vẫn là static:

```text
Browser -> Nginx/CDN -> static files
```

Admin/builder có thể dynamic:

```text
Admin -> builder UI -> template JSON -> rebuild route bị ảnh hưởng
```

## Kiến Trúc Mục Tiêu Mới

### Vai Trò Của Builder

Builder là static template builder.

Builder tạo reusable templates cho các scope:

- `home`
- `page`
- `post`
- `product`
- `taxonomy:product_cat`
- `taxonomy:category`
- `archive`
- exact route/content override sau này

### Vai Trò Của Theme

Theme cung cấp:

- Block library.
- Component renderers.
- Design tokens.
- CSS.
- Asset conventions.
- Fallback layout tối thiểu.

Theme không nên sở hữu bố cục chính bằng code hard-code.

### Vai Trò Của Build Pipeline

Build pipeline nên:

1. Tạo routes.
2. Xác định render context.
3. Resolve builder template.
4. Render template với `content`, `term`, `route`, `graph`, `site`.
5. Ghi static HTML và route data.

### Vai Trò Của Layout Adapter

Những file layout hiện tại nên trở thành adapter mỏng:

```text
resolve template
-> render template with context
-> return HTML
```

Không nên chứa long hard-coded storefront layout nữa.

## Phase Mới Nên Thêm

Roadmap hiện tại dừng ở v1.0, nhưng kiến trúc mới cần các phase mới.

### Phase 33 - Template Resolution Core

Trạng thái: `NEW / CHƯA LÀM`

Mục tiêu:

Thêm layer chọn đúng builder template cho mỗi route.

Cần có:

- `resolveTemplateForRoute(route, graph, config)`.
- Template scope model.
- Thứ tự resolve:
  1. Exact route/content override.
  2. Homepage template.
  3. Content type template.
  4. Taxonomy template.
  5. Archive template.
  6. Theme fallback.
- Tests cho route-to-template matching.

### Phase 34 - Template Storage Convention

Trạng thái: `NEW / CHƯA LÀM`

Mục tiêu:

Chốt nơi lưu template do builder tạo.

Convention đề xuất:

```text
layouts/templates/home.json
layouts/templates/page.json
layouts/templates/post.json
layouts/templates/product.json
layouts/templates/taxonomy.product_cat.json
layouts/templates/archive.json
```

Cần có:

- Template loader.
- Template validation.
- Template manifest/index.
- Docs về cách đặt tên và lưu template.

### Phase 35 - Homepage From Builder Template

Trạng thái: `NEW / CHƯA LÀM`

Mục tiêu:

Cho `/` render từ builder template JSON thay vì `renderStorefrontHome()` hard-code.

Cần có:

- `home.json` template đầu tiên.
- Các data-aware block cần cho homepage.
- Build-time render ra `dist/index.html`.
- Tests chứng minh homepage dùng template JSON.
- Output vẫn là static HTML.

### Phase 36 - Page Và Post Templates

Trạng thái: `NEW / CHƯA LÀM`

Mục tiêu:

Render các route `page` và `post` từ builder templates.

Cần có:

- `page.json`.
- `post.json`.
- Blocks cho title/body/SEO/breadcrumb.
- Tests với nhiều page/post dùng chung một template.

### Phase 37 - Product Template

Trạng thái: `NEW / CHƯA LÀM`

Mục tiêu:

Render tất cả product pages từ một reusable builder template.

Cần có:

- `product.json`.
- Product title block.
- Product gallery block.
- Product price block.
- Stock/SKU block.
- Variant selector block.
- CTA/add-to-cart boundary.
- Product description/spec block.
- Related products block.
- Tests chứng minh một template render nhiều product static files.

### Phase 38 - Taxonomy Và Product Category Templates

Trạng thái: `NEW / CHƯA LÀM`

Mục tiêu:

Render taxonomy/archive từ builder templates.

Cần có:

- `taxonomy.product_cat.json`.
- Tùy chọn `taxonomy.category.json`.
- Archive title/description block.
- Product grid block.
- Child category/tree block.
- Sort/filter shell block.
- Pagination block.
- Tests cho flat URL archives.

### Phase 39 - Builder UI Template Manager

Trạng thái: `NEW / CHƯA LÀM`

Mục tiêu:

Cho UI builder quản lý template theo scope.

Cần có:

- Blank canvas cho từng template scope.
- Template scope selector.
- Save/publish template.
- Preview template với sample content.
- Preview exact route bằng content/product/term được chọn.

### Phase 40 - Composite Components And Slots

Trạng thái: `NEW / CHƯA LÀM`

Mục tiêu:

Hỗ trợ component lớn như Header/Footer có rows, columns, slots.

Cần có:

- Composite component JSON.
- Header row/column slot model.
- Footer column slot model.
- Slot validation.
- Responsive visibility/settings.

### Phase 41 - Static MPA Enhanced Navigation

Trạng thái: `PLANNED / ĐÃ DOCUMENT MỘT PHẦN`

Mục tiêu:

Thêm fragment HTML output để static pages navigate nhanh hơn sau lần load đầu.

Docs hiện nói:

```text
Route JSON đã có.
Fragment HTML chưa có.
```

Cần có:

- `dist/fragments/{slug}/main.html`.
- Enhanced navigation script.
- Fallback về full-page navigation.
- Update metadata từ `data/routes/{slug}.json`.

### Phase 42 - Dynamic Widget Boundaries

Trạng thái: `PLANNED`

Mục tiêu:

Chốt dynamic widget hoạt động ra sao mà không phá static rendering.

Ví dụ:

- Sản phẩm bán chạy.
- Sản phẩm đã xem gần đây.
- Cart/account widgets.
- Runtime commerce widgets.

Cần có:

- Static-first widget contract.
- Optional hydration boundary.
- Runtime endpoint contract nếu cần.

### Phase 43 - Multi-Site Layout/Data Model

Trạng thái: `PLANNED`

Mục tiêu:

Chuẩn bị WPSC cho multi-site bằng `siteId`.

Source structure đề xuất:

```text
data/sites/{siteId}/content/
data/sites/{siteId}/layouts/
data/sites/{siteId}/components/
data/sites/{siteId}/routes/
```

Cần có:

- Site-aware config.
- Site-aware template paths.
- Site-aware build outputs.

## Các Phase Đã Xong Nhưng Cần Định Nghĩa Lại

### Theme System

Ý nghĩa cũ:

Theme layout có thể định nghĩa trực tiếp page/product/archive layout.

Ý nghĩa mới:

Theme cung cấp block/component/CSS/fallback. Builder template sở hữu bố cục chính.

### Visual Builder Layouts

Ý nghĩa cũ:

Builder layout là foundation cho visual builder.

Ý nghĩa mới:

Builder layout là source chính để static generation render trang.

### Production Builder

Ý nghĩa cũ:

Builder có thể save/publish layout JSON.

Ý nghĩa mới:

Builder cần quản lý template scopes và trigger rebuild toàn bộ route bị ảnh hưởng.

### Storefront UI

Ý nghĩa cũ:

Polish homepage/product/category layout trong theme code.

Ý nghĩa mới:

Storefront UI patterns nên trở thành block/template example trong builder JSON.

## Những Khoảng Trống Còn Lại

### 1. Template Resolution Chưa Là Đường Render Chính

Docs đã có visual builder layout JSON và content type mapping, nhưng theme rendering vẫn có thể dùng hard-coded layout modules.

Cần có:

```text
route -> template scope -> builder template -> renderLayout -> static HTML
```

### 2. Homepage Vẫn Là Tạm Thời

Homepage hiện đã có storefront shell hard-code. Cần thay bằng:

```text
layouts/templates/home.json
```

### 3. Product Và Taxonomy Builder Templates Chưa Thành Đường Chính

Cần chứng minh:

```text
1 product template -> nhiều product HTML files
1 product_cat template -> nhiều category archive HTML files
```

### 4. Fragment HTML Chưa Có

Docs ghi rõ:

```text
dist/data/routes/{slug}.json đã có
dist/fragments/{slug}/main.html chưa có
```

Cần cho Static MPA + Enhanced Navigation.

### 5. Composite Component UX Chưa Được Implement Đầy Đủ

Architecture notes đã mô tả:

- Header rows.
- Columns.
- Slots.
- Composite components.
- Responsive visibility.

Cần đưa vào implementation và UI builder.

### 6. Builder UI Vẫn Ở Mức Prototype

Cần thêm workflow thật:

- Chọn template scope.
- Mở blank canvas.
- Preview bằng real/sample data.
- Save draft.
- Publish.
- Rebuild affected routes.

### 7. Roadmap Chính Cần Cập Nhật

`outputs/WPSC_Revised_Master_Roadmap.md` đang dừng ở v1.0, chưa có các phase static template builder mới.

File này có thể làm nền để cập nhật roadmap chính.

## Việc Nên Làm Tiếp Ngay

### Bước 1

Dừng việc mở rộng homepage hard-code.

### Bước 2

Implement `resolveTemplateForRoute`.

### Bước 3

Tạo `home.json` builder template và render `/` từ template đó.

### Bước 4

Thêm tests:

```text
homepage route dùng builder template
output vẫn là static HTML
missing template fallback an toàn
```

### Bước 5

Mở rộng cùng pattern cho:

- `page`
- `post`
- `product`
- `taxonomy:product_cat`

### Bước 6

Cập nhật roadmap/docs chính để tất cả công việc sau đi theo kiến trúc template builder.

## Bảng Theo Dõi Nhanh

| Hạng mục | Trạng thái | Ghi chú |
| --- | --- | --- |
| Mini core static build | Done | Core pipeline đã hoạt động. |
| CLI/dev tooling | Done | Build/create/clean/doctor/serve/dev. |
| WordPress adapter | Done | Có ACF, media, terms, Rank Math. |
| WooCommerce adapter | Done | Có products, terms, variations, SEO. |
| Unified graph | Done | Graph độc lập source. |
| SEO output | Done | Metadata, sitemap, robots. |
| Theme system | Done, cần định nghĩa lại | Nên phục vụ builder template, không sở hữu layout chính. |
| Asset pipeline | Done | Remote media/cache đã có. |
| Plugin system | Done | Stable hooks. |
| Incremental build | Done | Dependency graph và changed routes. |
| Performance cache | Done | Content/route/asset cache và parallel work. |
| Public route JSON | Done | Route JSON đã có. |
| Route fragments | Chưa làm | Cần cho enhanced navigation. |
| Visual builder foundation | Done | Layout JSON và renderer đã có. |
| Builder UI prototype | Done | Palette/canvas/props/preview/export. |
| Production builder foundation | Done | Auth/revisions/draft/publish/rebuild trigger. |
| Template resolution core | Chưa làm | Ưu tiên mới. |
| Homepage từ builder template | Chưa làm | Homepage hard-code hiện tại là tạm thời. |
| Product template từ builder | Chưa làm | Cần cho template-builder model thật. |
| Product category template từ builder | Chưa làm | Cần cho taxonomy archive model. |
| Template manager UI | Chưa làm | Cần cho workflow builder thật. |
| Composite header/footer builder | Planned | Đã mô tả trong architecture notes. |
| Multi-site model | Planned | Đã mô tả, chưa phải ưu tiên ngay. |

## Kết Luận

WPSC đã có nền static commerce khá đầy đủ: adapters, graph, SEO, routing, static output, incremental rebuild, cache, deploy docs, visual builder foundation.

Việc lớn còn lại không phải là thêm UI hard-code nữa, mà là biến builder thành nguồn template chính.

Milestone quan trọng tiếp theo:

```text
Builder template JSON trở thành source render cho homepage,
sau đó page/post/product/product_cat,
trong khi output cuối vẫn là static HTML serve trực tiếp bởi Nginx/CDN.
```
