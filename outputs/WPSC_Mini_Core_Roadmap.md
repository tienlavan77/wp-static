# WPSC Mini Core Roadmap

## Muc tieu

Xay dung ban WPSC nhanh, don gian, chay duoc that truoc khi tach thanh monorepo framework.

Phien ban dau tien chi tap trung vao pipeline:

```text
Mock data
-> Content model
-> Router
-> Renderer
-> Builder
-> dist/*.html
```

Chua lam trong giai doan nay:

- WordPress Adapter that.
- WooCommerce Adapter that.
- Plugin System.
- Dev Server nang cao.
- Incremental Cache.
- Theme marketplace.
- Monorepo nhieu package.

## Nguyen tac thuc hien

- Moi commit chi co mot muc tieu ro rang.
- Commit nao cung phai co ket qua kiem tra duoc.
- Khong viet abstraction neu chua co use case.
- Khong dong bang `DONE` cho den khi prototype chay qua example.
- Public API tam thoi duoc xem la `DRAFT`.
- Khi co thay doi kien truc lon, tao RFC truoc.

## Phase 0 - Chot nen tang

### Commit 001 - docs: add architecture draft for mini core

Muc tieu:

- Tao `ARCHITECTURE.md`.
- Chot pipeline chinh.
- Dinh nghia trach nhiem cua CLI, Config, Adapter, Content, Router, Renderer, Builder.

Files du kien:

```text
ARCHITECTURE.md
```

Tieu chi hoan thanh:

- Co so do pipeline duy nhat.
- Co bang package/module responsibility.
- Co rule route conflict: trung slug thi build fail.
- Danh dau architecture status la `DRAFT`.

### Commit 002 - chore: initialize esm node package

Muc tieu:

- Khoi tao package Node.js ESM.
- Chot Node.js >= 20.
- Them script build example.

Files du kien:

```text
package.json
.gitignore
src/index.js
```

Tieu chi hoan thanh:

- `node` co the import `src/index.js`.
- `npm run build:example` ton tai, co the chua build that.

## Phase 1 - Data va Content Model

### Commit 003 - feat(example): add basic shop mock content

Muc tieu:

- Tao example dau tien.
- Dung JSON lam nguon data.

Files du kien:

```text
examples/basic-shop/content.json
examples/basic-shop/wpsc.config.js
```

Tieu chi hoan thanh:

- Co it nhat 1 homepage, 1 page, 2 product.
- Moi item co `id`, `type`, `title`, `slug`, `domain`, `data`.

### Commit 004 - feat(core): add immutable content model

Muc tieu:

- Tao `createContent()`.
- Dung `deepFreeze()` de immutable model.
- Validate field bat buoc.

Files du kien:

```text
src/core/createContent.js
src/shared/deepFreeze.js
```

Tieu chi hoan thanh:

- Content tao ra khong mutate duoc.
- Thieu `id`, `title`, `slug` thi throw Error ro nghia.

### Commit 005 - feat(adapter): add mock adapter

Muc tieu:

- Doc mock content tu JSON.
- Tra ve danh sach Content model.

Files du kien:

```text
src/adapters/mockAdapter.js
```

Tieu chi hoan thanh:

- Adapter khong render HTML.
- Adapter khong ghi file output.
- Adapter chi doc data va chuan hoa thanh Content.

## Phase 2 - Routing

### Commit 006 - feat(router): create routes from content slugs

Muc tieu:

- Tao route tu `domain/slug`.
- Khong ep prefix `/product`, `/blog`, `/category`.

Files du kien:

```text
src/router/createRoutes.js
```

Tieu chi hoan thanh:

- Slug `home` hoac config homepage sinh route `/`.
- Slug `iphone-15` sinh route `/iphone-15`.
- Route co output path tuong ung `iphone-15.html`.

### Commit 007 - feat(router): fail on duplicate routes

Muc tieu:

- Bao loi khi 2 Content sinh cung route.

Files du kien:

```text
src/router/createRoutes.js
```

Tieu chi hoan thanh:

- Duplicate slug lam build fail.
- Error message noi ro route nao bi trung va content id lien quan.

## Phase 3 - Rendering

### Commit 008 - feat(renderer): add html template helper

Muc tieu:

- Tao helper `html`.
- Escape gia tri chen vao template de tranh HTML injection co ban.

Files du kien:

```text
src/renderer/html.js
src/shared/escapeHtml.js
```

Tieu chi hoan thanh:

- `html` tra ve string.
- Gia tri dynamic duoc escape mac dinh.

### Commit 009 - feat(example): add basic layout

Muc tieu:

- Tao layout dau tien cho shop.

Files du kien:

```text
examples/basic-shop/theme/layout.js
```

Tieu chi hoan thanh:

- Layout render duoc title va data cua content.
- Khong phu thuoc React, Next.js, JSX.

### Commit 010 - feat(renderer): render route with layout

Muc tieu:

- Ket noi route voi layout.
- Sinh HTML document hoan chinh.

Files du kien:

```text
src/renderer/renderPage.js
```

Tieu chi hoan thanh:

- Moi route render ra HTML co `<!doctype html>`.
- Title nam trong `<title>`.
- Body co noi dung tu Content.

## Phase 4 - Build Pipeline

### Commit 011 - feat(core): add compile pipeline

Muc tieu:

- Tao `compile(config)`.
- Dieu phoi adapter -> route -> render plan.

Files du kien:

```text
src/core/compile.js
```

Tieu chi hoan thanh:

- Compiler khong goi network.
- Compiler khong ghi file.
- Compiler tra ve site plan gom routes/pages.

### Commit 012 - feat(builder): write static html files

Muc tieu:

- Ghi HTML ra `dist`.

Files du kien:

```text
src/builder/buildSite.js
```

Tieu chi hoan thanh:

- Build tao `examples/basic-shop/dist/index.html`.
- Product tao `examples/basic-shop/dist/iphone-15.html`.
- Builder la noi duy nhat ghi file output.

### Commit 013 - feat(cli): add wpsc build command

Muc tieu:

- Them CLI build.
- Load `wpsc.config.js`.
- Goi compile va buildSite.

Files du kien:

```text
src/cli/index.js
```

Tieu chi hoan thanh:

- Chay `npm run build:example` sinh static site.
- CLI in ra so page da build.
- Loi duplicate route hien thi de doc.

## Phase 5 - Verification va tai lieu

### Commit 014 - test: add unit tests for shared utilities and routing

Muc tieu:

- Test cac phan rui ro cao nhat.

Files du kien:

```text
test/deepFreeze.test.js
test/escapeHtml.test.js
test/createRoutes.test.js
```

Tieu chi hoan thanh:

- Test immutable model.
- Test escape HTML.
- Test duplicate route.

### Commit 015 - docs: add mini core usage guide

Muc tieu:

- Viet README cach dung prototype.

Files du kien:

```text
README.md
```

Tieu chi hoan thanh:

- Co lenh cai dat/chay build.
- Co giai thich cau truc example.
- Co mo ta gioi han hien tai.

### Commit 016 - chore: mark mini core prototype complete

Muc tieu:

- Cap nhat changelog.
- Tong ket nhung gi da co.
- Chua freeze architecture, chi danh dau prototype complete.

Files du kien:

```text
CHANGELOG.md
ARCHITECTURE.md
```

Tieu chi hoan thanh:

- `npm run build:example` pass.
- Static HTML sinh dung.
- Tai lieu noi ro buoc tiep theo la tach package.

## Phase 6 - Sau prototype

### Commit 017 - docs(rfc): propose monorepo extraction

Muc tieu:

- Tao RFC tach package.
- Khong code tach package trong commit nay.

Files du kien:

```text
rfcs/RFC-0002-monorepo-extraction.md
```

Tieu chi hoan thanh:

- Co mapping tu `src/*` sang `packages/*`.
- Co ly do tach package.
- Co rui ro va migration plan.

### Commit 018 - refactor: extract shared package

Muc tieu:

- Tach utility dung chung dau tien.

Files du kien:

```text
packages/shared
```

Tieu chi hoan thanh:

- `@wpsc/shared` khong phu thuoc package khac.
- Public API chi qua `src/index.js`.

### Commit 019 - refactor: extract core router renderer builder packages

Muc tieu:

- Tach cac module chinh sau khi RFC accepted.

Files du kien:

```text
packages/core
packages/router
packages/renderer
packages/builder
```

Tieu chi hoan thanh:

- Build example van pass.
- Khong import truc tiep file noi bo giua package.

### Commit 020 - feat(adapter): add wordpress adapter draft

Muc tieu:

- Bat dau adapter WordPress that sau khi core on dinh.

Files du kien:

```text
packages/adapters/src/wordpress
```

Tieu chi hoan thanh:

- Client goi WordPress REST API.
- Repository lam viec qua Client.
- Normalizer map raw WordPress data thanh Content.

## Checklist theo doi nhanh

```text
[x] 001 docs: add architecture draft for mini core
[x] 002 chore: initialize esm node package
[x] 003 feat(example): add basic shop mock content
[x] 004 feat(core): add immutable content model
[x] 005 feat(adapter): add mock adapter
[x] 006 feat(router): create routes from content slugs
[x] 007 feat(router): fail on duplicate routes
[x] 008 feat(renderer): add html template helper
[x] 009 feat(example): add basic layout
[x] 010 feat(renderer): render route with layout
[x] 011 feat(core): add compile pipeline
[x] 012 feat(builder): write static html files
[x] 013 feat(cli): add wpsc build command
[x] 014 test: add unit tests for shared utilities and routing
[x] 015 docs: add mini core usage guide
[x] 016 chore: mark mini core prototype complete
[x] 017 docs(rfc): propose monorepo extraction
[x] 018 refactor: extract shared package
[x] 019 refactor: extract core router renderer builder packages
[x] 020 feat(adapter): add wordpress adapter draft
```

## Definition of Done cho prototype

Prototype duoc xem la hoan thanh khi:

- `npm run build:example` chay thanh cong.
- `examples/basic-shop/dist/index.html` duoc sinh ra.
- It nhat 3 route static HTML duoc sinh ra.
- Duplicate slug bi chan.
- Content model immutable.
- Renderer khong phu thuoc frontend framework.
- Builder la noi duy nhat ghi output.
- README va ARCHITECTURE cap nhat dung trang thai.
