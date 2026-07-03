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

## Phase 14 - Real Project Battle Test

Muc tieu:

- Dung mot WordPress/WooCommerce site that de build static.
- Ghi lai missing cases.
- Khong them abstraction neu chua gap case that.

Commits:

```text
129 test(real): add real project checklist
130 fix(wp): handle real WordPress edge cases
131 fix(woo): handle real WooCommerce edge cases
132 docs: add real project migration notes
```

## Phase 15 - Performance And Cache

Muc tieu:

- Build nhanh voi site lon.

Commits:

```text
133 feat(cache): add content cache
134 feat(cache): add media cache
135 feat(build): add incremental build
136 feat(build): add parallel rendering
137 test(perf): add large catalog benchmark
```

## Phase 16 - Advanced Commerce

Muc tieu:

- Ho tro shop lon hon.

Commits:

```text
138 feat(commerce): support product variants pages
139 feat(commerce): support sale and stock filters
140 feat(commerce): generate category listing pages
141 feat(commerce): generate related product data
142 docs(commerce): add advanced commerce guide
```

## Phase 17 - Deployment Integrations

Muc tieu:

- Deploy de hon.

Commits:

```text
143 feat(deploy): add rsync deploy helper
144 feat(deploy): add Cloudflare Pages guide
145 feat(deploy): add S3/R2 guide
146 feat(deploy): add GitHub Actions guide
```

## Phase 18 - Preview And Webhook Workflow

Muc tieu:

- Gan voi workflow content team.

Commits:

```text
147 feat(preview): add draft preview mode
148 feat(webhook): add rebuild webhook example
149 feat(report): add content validation report
150 docs(preview): add editor workflow guide
```

## Phase 19 - API Stabilization

Muc tieu:

- Dong API on dinh de tien toi v1.0.

Commits:

```text
151 docs(api): mark stable public APIs
152 docs(api): add migration policy
153 test(api): add API compatibility tests
154 chore: add deprecation policy
```

## Phase 20 - v1.0 Release

Muc tieu:

- Production framework v1.0.

Commits:

```text
155 chore: freeze v1 plugin API
156 chore: freeze v1 theme API
157 chore: freeze v1 adapter API
158 docs: add v1 documentation set
159 chore: prepare v1.0.0 release
```

Ket qua:

```text
WPSC v1.0 production framework
```
