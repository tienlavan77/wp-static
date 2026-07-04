# WPSC Revised Master Roadmap

## Muc tieu

Xay dung WPSC thanh static commerce framework thuc dung cho WordPress/WooCommerce, khong chi la static generator demo.

Dieu chinh quan trong:

- WordPress adapter phai lay du lieu thuc te ngay trong Phase 5.
- Rank Math SEO, ACF, taxonomy, media, menu khong de qua muon.
- Phase SEO sau do chi render metadata/sitemap/robots tu model da normalize.
- WooCommerce di sau WordPress core data de khong lam vo normalizer.

## Phase 1 - Mini Core Prototype

Trang thai: `DONE`

Muc tieu:

- Build duoc HTML static tu mock content.
- Co Content model immutable.
- Co router, renderer, builder, CLI co ban.

Ket qua:

```text
Mock data -> Content -> Route -> HTML -> dist
```

## Phase 2 - Tool Usability

Trang thai: `DONE`

Muc tieu:

- Git repo that.
- CLI co `build`, `create`, `--help`, `--version`.
- Config loader.
- Copy public assets.
- Example co CSS.
- WordPress adapter draft.

## Phase 3 - Developer Operations

Trang thai: `DONE`

Muc tieu:

- Bo trailing slash public slug.
- Output slug thanh `.html` de tranh Nginx redirect.
- CLI co `clean`, `doctor`, `serve`.
- Config validation.
- Build summary.

## Phase 4 - Core Hardening

Trang thai: `DONE`

Muc tieu:

- Lam core chac truoc khi noi data WordPress that.
- Loi ro rang, manifest ro rang, integration tests day du.

Commits:

```text
042 feat(error): add ConfigError, RouteError, BuildError, AdapterError
043 feat(logger): add quiet and verbose logging
044 feat(config): normalize project paths
045 feat(build): add build manifest
046 feat(build): add content and route manifest
047 test: add build pipeline integration tests
048 docs: document draft public APIs
```

Output mong muon:

```text
dist/.wpsc/manifest.json
```

## Phase 5 - WordPress Data Adapter

Trang thai: `DONE`

Muc tieu:

- Lay du lieu WordPress thuc te ngay tu dau.
- Normalize tat ca ve `Content`.
- Rank Math SEO duoc normalize vao `content.seo`.
- ACF, taxonomy, media, menu nam trong data model, khong de renderer goi WordPress truc tiep.

Commits:

```text
049 feat(wp-client): fetch REST collections with pagination
050 feat(wp-client): fetch pages and posts
051 feat(wp-client): fetch custom post types
052 feat(wp-client): fetch taxonomies and terms
053 feat(wp-client): fetch media library items
054 feat(wp-client): fetch menus
055 feat(wp-client): support _embed data
056 feat(wp-acf): normalize ACF fields
057 feat(wp-seo): normalize Rank Math SEO fields
058 feat(wp-normalizer): normalize pages and posts into Content
059 feat(wp-normalizer): normalize CPT items into Content
060 feat(wp-normalizer): attach terms, media, menus, acf, and seo
061 feat(wp-adapter): expose wordpress adapter through config
062 test(wp): add mocked WordPress fixtures
063 test(wp-seo): add Rank Math fixture tests
064 docs(wp): add WordPress adapter guide
```

Config mong muon:

```js
export default {
  adapter: {
    type: "wordpress",
    baseUrl: "https://example.com",
    contentTypes: ["pages", "posts"],
    customPostTypes: ["du-an", "thuong-hieu"],
    taxonomies: ["category", "post_tag"],
    includeMedia: true,
    includeMenus: true,
    includeAcf: true,
    seo: {
      provider: "rankmath"
    }
  }
};
```

Content SEO shape:

```js
{
  seo: {
    title: "...",
    description: "...",
    canonical: "...",
    robots: ["index", "follow"],
    focusKeyword: "...",
    openGraph: {
      title: "...",
      description: "...",
      image: "..."
    },
    twitter: {
      title: "...",
      description: "...",
      image: "..."
    }
  }
}
```

Rank Math fields can normalize from:

```text
rank_math_title
rank_math_description
rank_math_focus_keyword
rank_math_canonical_url
rank_math_robots
rank_math_facebook_title
rank_math_facebook_description
rank_math_facebook_image
rank_math_twitter_title
rank_math_twitter_description
rank_math_twitter_image
```

## Phase 6 - WooCommerce Data Adapter

Trang thai: `DONE`

Muc tieu:

- Lay san pham WooCommerce that.
- Product van normalize ve `Content`.
- Category, tag, image, price, stock, variation duoc dua vao `data`.
- SEO cua product van di qua `content.seo` neu co Rank Math.

Commits:

```text
065 feat(woo-client): fetch products with pagination
066 feat(woo-client): fetch product categories and tags
067 feat(woo-client): fetch variations
068 feat(woo-normalizer): normalize products into Content
069 feat(woo-normalizer): normalize price, sale price, stock, sku
070 feat(woo-normalizer): attach product images and categories
071 feat(woo-seo): normalize Rank Math product SEO
072 feat(woo-adapter): expose woocommerce adapter through config
073 test(woo): add mocked WooCommerce fixtures
074 docs(woo): add WooCommerce adapter guide
```

## Phase 7 - Unified Content Graph

Trang thai: `DONE`

Muc tieu:

- Ket noi Page/Post/Product/Term/Menu/Media thanh graph de theme truy cap de dang.
- Khong de compiler biet rieng WordPress hay WooCommerce.

Commits:

```text
075 feat(content): add ContentCollection model
076 feat(content): add Term model
077 feat(content): add Media model
078 feat(content): add Menu model
079 feat(content): add relation resolver
080 feat(content): add lookup services by id, slug, type, term
081 test(content): add graph resolver tests
```

## Phase 8 - SEO Output System

Trang thai: `DONE`

Muc tieu:

- Render SEO tu `content.seo`.
- Khong biet Rank Math la gi.
- Generate sitemap va robots.

Commits:

```text
082 feat(seo): render title and meta description
083 feat(seo): render canonical and robots meta
084 feat(seo): render Open Graph tags
085 feat(seo): render Twitter Card tags
086 feat(seo): generate sitemap.xml
087 feat(seo): generate robots.txt
088 feat(seo): support default site metadata fallbacks
089 test(seo): add metadata and sitemap tests
090 docs(seo): add SEO output guide
```

## Phase 9 - Theme System

Trang thai: DONE

Muc tieu:

- Luc nay moi dau tu layout/theme.
- Theme co layout theo content type.
- Components va assets co convention ro.

Commits:

```text
091 feat(theme): add theme resolver
092 feat(theme): support layouts by content type
093 feat(theme): support fallback layout
094 feat(theme): support components directory
095 feat(theme): support theme assets convention
096 feat(theme): add theme metadata
097 docs(theme): add theme authoring guide
```

## Phase 10 - Asset And Image Pipeline

Trang thai: DONE

Muc tieu:

- Tai anh tu WordPress/WooCommerce ve static.
- Rewrite URL anh.
- Cache de build nhanh.

Commits:

```text
098 feat(asset): download remote media assets
099 feat(asset): cache downloaded assets
100 feat(asset): rewrite image URLs in content
101 feat(asset): generate asset manifest
102 feat(asset): copy theme assets
103 test(asset): add asset pipeline tests
```

## Phase 11 - Dev Server And Watch Mode

Trang thai: DONE

Muc tieu:

- Dev nhanh.
- Watch content/theme/config.
- Rebuild va reload.

Commits:

```text
104 feat(dev): add watch mode
105 feat(dev): rebuild on content changes
106 feat(dev): rebuild on theme changes
107 feat(dev): rebuild on config changes
108 feat(dev): add live reload script
109 test(dev): add watcher smoke tests
```

Lenh mong muon:

```bash
wpsc dev --project examples/basic-shop --port 8080
```

## Phase 12 - Plugin System

Trang thai: DONE

Muc tieu:

- Mo rong framework ma khong sua core.
- Plugin hook vao data, route, render, build.

Commits:

```text
110 feat(plugin): define plugin interface
111 feat(plugin): load plugins from config
112 feat(plugin): add data hooks
113 feat(plugin): add route hooks
114 feat(plugin): add render hooks
115 feat(plugin): add build hooks
116 test(plugin): add plugin hook tests
117 docs(plugin): add plugin authoring guide
```

## Phase 13 - Package Extraction And v0.1 Release

Trang thai: DONE

Muc tieu:

- Tach package sau khi data/theme/seo pipeline da du hinh.
- Chuan bi publish v0.1.0.

Commits:

```text
118 refactor(shared): extract @wpsc/shared
119 refactor(core): extract @wpsc/core
120 refactor(adapters): extract @wpsc/adapters
121 refactor(router): extract @wpsc/router
122 refactor(renderer): extract @wpsc/renderer
123 refactor(builder): extract @wpsc/builder
124 refactor(cli): extract @wpsc/cli
125 chore: configure npm workspaces
126 test: verify package boundaries
127 docs: add getting started guide
128 chore: prepare v0.1.0 release
```

Ket qua:

```text
WPSC v0.1.0 usable framework
```

## Phase 14 - Real Source Integration And Source Auth

Trang thai: DONE

Muc tieu:

- Dung mot WordPress/WooCommerce site that de build static.
- Kiem tra endpoint that: Rank Math, ACF, menu, media, CPT, taxonomy, WooCommerce.
- Ho tro authentication giua WPSC va source data.
- Khong hardcode secret vao config.

Commits:

```text
129 test(real): add real project checklist
130 feat(auth): load source credentials from env
131 feat(wp): support WordPress application password auth
132 feat(wp): support bearer token auth
133 feat(woo): support WooCommerce API credentials from env
134 fix(wp): handle real WordPress edge cases
135 fix(woo): handle real WooCommerce edge cases
136 docs: add real source integration guide
```

## Phase 15 - Private Data And Preview Safety

Trang thai: DONE

Muc tieu:

- Build preview/draft/private data mot cach an toan.
- Khong publish private data ra static output ngoai y muon.
- Tach ro public build va preview build.

Commits:

```text
137 feat(preview): add preview build mode
138 feat(preview): support draft and private source items
139 feat(preview): add preview token guard
140 feat(build): exclude private content from public output
141 test(preview): add private data safety tests
142 docs(preview): add preview workflow guide
```

## Phase 16 - Customer Auth Strategy

Trang thai: DONE

Muc tieu:

- Chot chien luoc dang nhap nguoi dung cho website.
- Tach static core voi runtime auth/session.
- Khong expose WooCommerce/WordPress secret ra frontend.

Commits:

```text
143 docs(auth): define customer auth architecture
144 docs(auth): compare no-login, headless WooCommerce, and custom backend modes
145 docs(auth): define token, cookie, CORS, and CSRF rules
146 test(auth): add auth boundary contract tests
```

## Phase 17 - Runtime Commerce API

Trang thai: DONE

Muc tieu:

- Them runtime API rieng cho cart, checkout, order, account neu site can login.
- Proxy WooCommerce an toan.
- Quan ly session/cookie/JWT phia server.

Commits:

```text
147 feat(runtime): scaffold commerce API service
148 feat(runtime): add cart endpoints
149 feat(runtime): add checkout proxy endpoint
150 feat(runtime): add customer session middleware
151 feat(runtime): add order lookup endpoint
152 test(runtime): add commerce API tests
153 docs(runtime): add runtime deployment guide
```

## Phase 18 - Customer Account UI

Trang thai: DONE

Muc tieu:

- Them UI login/account neu runtime auth duoc bat.
- Khong bat buoc cho static catalog thuong.

Commits:

```text
154 feat(account): add login and logout views
155 feat(account): add account dashboard route
156 feat(account): add order history view
157 feat(account): add address book view
158 test(account): add customer account UI tests
```

## Phase 19 - Taxonomy And Archive Pages

Trang thai: DONE

Muc tieu:

- Sinh page cho category, tag, product category, taxonomy archive.
- Ho tro pagination/archive.
- Dua archive vao sitemap va content graph.
- Giu hop dong URL `domain/slug`, khong them taxonomy base, khong trailing slash cho archive.

Commits:

```text
159 feat(taxonomy): add archive route generation
160 test(taxonomy): add archive route tests
161 docs(taxonomy): add archive authoring guide
162 fix(taxonomy): use slug-only archive routes
```

## Phase 20 - Webhook Rebuild Workflow

Trang thai: DONE

Muc tieu:

- Gan voi workflow content team.
- WordPress/WooCommerce save post/product/page/term/menu thi goi webhook build.
- Queue rebuild de tranh chay chong.
- Webhook payload chi dua route hint dang `slug`, khong them taxonomy base vao public URL.

Commits:

```text
166 feat(webhook): define rebuild webhook payload
167 feat(webhook): add webhook receiver example
168 feat(webhook): add rebuild queue guard
169 feat(webhook): map source events to changed items
170 feat(report): add content validation report
171 docs(webhook): add editor workflow guide
```

## Phase 21 - Incremental Build Engine

Trang thai: DONE

Muc tieu:

- Sua cai nao thi build lai cai do va cac phan lien quan.
- Full build chi dung cho build dau tien hoac doi lon.
- Dung dependency graph de tinh route bi anh huong.
- Changed route hint van tuan thu `domain/slug`.
- Route moi/route can xem duoc link tu demo homepage neu la public route.

Commits:

```text
172 feat(incremental): add route dependency graph
173 feat(incremental): track input hashes
174 feat(incremental): add changed item parser
175 feat(incremental): rebuild changed product dependencies
176 feat(incremental): rebuild changed post dependencies
177 feat(incremental): rebuild changed taxonomy dependencies
178 feat(incremental): rebuild menu and theme dependencies
179 feat(incremental): update sitemap, assets, and manifest incrementally
180 test(incremental): add changed item build tests
181 docs(incremental): add incremental build guide
```

Lenh mong muon:

```bash
wpsc build --changed product:123
wpsc build --changed post:88
wpsc build --changed term:product_cat:iphone
wpsc build --changed menu:primary
```

## Phase 22 - Performance And Cache

Trang thai: DONE

Muc tieu:

- Build nhanh voi site lon.
- Cache content/media/asset va parallel rendering.
- Cache khong doi public URL, van giu `domain/slug`.

Commits:

```text
182 feat(cache): add content cache
183 feat(cache): add media cache
184 feat(cache): add route render cache
185 feat(build): add parallel rendering
186 test(perf): add large catalog benchmark
```

## Phase 23 - Block Schema System

Trang thai: DONE

Muc tieu:

- Nen tang cho giao dien keo tha.
- Dinh nghia block, props schema, data binding schema.
- Demo homepage dung block `commerce/archive-links` de co the xem truc tiep.

Commits:

```text
187 feat(block): define block schema
188 feat(block): add props validation
189 feat(block): add data binding schema
190 feat(block): add core commerce blocks
191 test(block): add block schema tests
192 docs(block): add block authoring guide
```

## Phase 24 - Visual Builder Data Model - DONE

Muc tieu:

- [x] Luu layout keo tha thanh JSON.
- [x] Layout theo content type: page, post, product, category.
- [x] Ho tro section/component nesting va responsive settings.

Commits:

```text
193 feat(builder): add layout JSON model
194 feat(builder): add content type layout documents
195 feat(builder): add nested sections and blocks
196 feat(builder): add responsive settings model
197 test(builder): add layout model tests
```

## Phase 25 - Visual Builder Renderer

Muc tieu:

- Render layout JSON thanh HTML static.
- Mapping block voi content graph.
- Fallback an toan khi thieu data.

Commits:

```text
198 feat(builder): render layout JSON
199 feat(builder): bind blocks to content graph
200 feat(builder): support product blocks
201 feat(builder): support taxonomy blocks
202 feat(builder): add missing data fallbacks
203 test(builder): add visual renderer tests
```

## Phase 26 - Builder UI Prototype

Muc tieu:

- Prototype UI keo tha dung duoc.
- Preview live va save layout JSON.
- Chua can dep, uu tien workflow that.

Commits:

```text
204 feat(builder-ui): scaffold builder app
205 feat(builder-ui): add block palette
206 feat(builder-ui): add drag and drop canvas
207 feat(builder-ui): add props panel
208 feat(builder-ui): add live preview
209 feat(builder-ui): save layout JSON
210 test(builder-ui): add builder smoke tests
```

## Phase 27 - Theme And Builder Integration

Muc tieu:

- Theme cung cap block library.
- Project co the override block.
- Builder dung component that cua theme.

Commits:

```text
211 feat(theme): expose theme block library
212 feat(builder): load theme blocks
213 feat(builder): support project block overrides
214 feat(builder): preview theme components
215 test(builder): add theme block integration tests
```

## Phase 28 - Production Builder

Muc tieu:

- Builder san sang dung cho editor.
- Co auth, revision, draft/publish layout.
- Layout doi thi trigger rebuild.

Commits:

```text
216 feat(builder): add editor auth guard
217 feat(builder): add layout revisions
218 feat(builder): add draft and publish flow
219 feat(builder): trigger rebuild on layout publish
220 docs(builder): add production builder guide
```

## Phase 29 - Advanced Commerce

Muc tieu:

- Ho tro shop lon hon.

Commits:

```text
221 feat(commerce): support product variants pages
222 feat(commerce): support sale and stock filters
223 feat(commerce): generate related product data
224 docs(commerce): add advanced commerce guide
```

## Phase 30 - Deployment Integrations

Muc tieu:

- Deploy de hon.

Commits:

```text
225 feat(deploy): add rsync deploy helper
226 feat(deploy): add Cloudflare Pages guide
227 feat(deploy): add S3/R2 guide
228 feat(deploy): add GitHub Actions guide
```

## Phase 31 - API Stabilization

Muc tieu:

- Dong API on dinh de tien toi v1.0.

Commits:

```text
229 docs(api): mark stable public APIs
230 docs(api): add migration policy
231 test(api): add API compatibility tests
232 chore: add deprecation policy
```

## Phase 32 - v1.0 Release

Muc tieu:

- Production framework v1.0.

Commits:

```text
233 chore: freeze v1 plugin API
234 chore: freeze v1 theme API
235 chore: freeze v1 adapter API
236 docs: add v1 documentation set
237 chore: prepare v1.0.0 release
```

Ket qua:

```text
WPSC v1.0 production framework
```
