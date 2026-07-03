# WPSC Phase 2 Roadmap

## Muc tieu

Bien WPSC Mini Core tu prototype chay duoc thanh mot tool co the dung lap lai cho nhieu project.

Trong Phase 2, uu tien:

- Co git history that.
- CLI co `build`, `--help`, `--version`.
- Config loading tach rieng.
- Static assets duoc copy ra `dist`.
- Example shop nhin duoc tren browser.
- Co lenh tao project moi tu template.
- Bat dau WordPress adapter theo dung layer.

## Nguyen tac

- Moi commit chi mot muc tieu.
- Moi commit phai test local va VPS neu co anh huong runtime.
- Khong them dependency neu Node.js built-in lam duoc.
- Khong tach monorepo sau hon neu chua can.
- WordPress adapter phai di qua Client -> Repository -> Normalizer -> Content.

## Phase 2A - Git va CLI nen tang

### Commit 021 - chore: initialize git repository

Muc tieu:

- Khoi tao git repo that.
- Commit trang thai hien tai cua prototype.

Files du kien:

```text
.git/
```

Tieu chi hoan thanh:

- `git status` clean sau commit.
- Commit dau tien gom prototype da pass test.

### Commit 022 - feat(cli): add help and version flags

Muc tieu:

- Them `--help`.
- Them `--version`.
- Help text ngan gon, dung command hien co.

Lenh mong muon:

```bash
wpsc --help
wpsc --version
node src/cli/index.js --help
node src/cli/index.js --version
```

Tieu chi hoan thanh:

- Khong in stack trace.
- Exit code `0`.
- README cap nhat.

### Commit 023 - feat(cli): support build default project

Muc tieu:

- `wpsc build` build project hien tai.
- `wpsc build --project examples/basic-shop` van hoat dong.

Tieu chi hoan thanh:

- Chay duoc trong project root co `wpsc.config.js`.
- Error ro khi khong thay config.

## Phase 2B - Config va Builder tot hon

### Commit 024 - feat(core): add config loader

Muc tieu:

- Tach logic load `wpsc.config.js` ra `src/core/loadConfig.js`.
- CLI khong tu import config truc tiep nua.

Files du kien:

```text
src/core/loadConfig.js
test/loadConfig.test.js
```

Tieu chi hoan thanh:

- Load config theo project dir.
- Error ro khi thieu config.
- Test pass.

### Commit 025 - feat(builder): copy public assets

Muc tieu:

- Copy `public/` sang `dist/`.
- Builder van la noi duy nhat ghi output.

Files du kien:

```text
src/builder/copyPublicAssets.js
examples/basic-shop/public/
```

Tieu chi hoan thanh:

- `examples/basic-shop/public/style.css` duoc copy thanh `dist/style.css`.
- Khong copy neu `public/` khong ton tai.
- Test/build pass.

### Commit 026 - feat(example): add browser-ready shop styles

Muc tieu:

- Lam Basic Shop nhin duoc tren browser.
- Them CSS tinh.
- Layout link toi `/style.css`.

Files du kien:

```text
examples/basic-shop/public/style.css
examples/basic-shop/theme/layout.js
src/renderer/renderPage.js
```

Tieu chi hoan thanh:

- `tinsinhphat.local` hien giao dien co style.
- Product page doc duoc, khong bi layout vo.

## Phase 2C - Template tao project

### Commit 027 - feat(template): add basic shop template

Muc tieu:

- Dua example thanh template co the copy.

Files du kien:

```text
templates/basic-shop/
```

Tieu chi hoan thanh:

- Template co `content.json`, `wpsc.config.js`, `theme/layout.js`, `public/style.css`.
- Khong chua `dist`.

### Commit 028 - feat(cli): add create command

Muc tieu:

- Them `wpsc create <project-name>`.
- Copy tu `templates/basic-shop`.

Lenh mong muon:

```bash
wpsc create my-shop
node src/cli/index.js create work/my-shop
```

Tieu chi hoan thanh:

- Tao project moi.
- Khong overwrite thu muc da ton tai.
- Project moi build duoc bang `wpsc build --project work/my-shop`.

## Phase 2D - WordPress adapter draft that hon

### Commit 029 - feat(wordpress): add wordpress client draft

Muc tieu:

- Tao client goi WordPress REST API.
- Chua can tich hop CLI.

Files du kien:

```text
src/adapters/wordpress/wordpressClient.js
```

Tieu chi hoan thanh:

- Client chi fetch raw JSON.
- Khong normalize, khong render, khong ghi file.

### Commit 030 - feat(wordpress): add repository and normalizer draft

Muc tieu:

- Repository dung Client.
- Normalizer map raw WP item thanh Content input.

Files du kien:

```text
src/adapters/wordpress/wordpressRepository.js
src/adapters/wordpress/normalizeWordPressContent.js
```

Tieu chi hoan thanh:

- Layer dung: Repository -> Client, Normalizer -> Content input.
- Co test bang mock raw data, khong can network.

### Commit 031 - feat(adapter): wire wordpress adapter behind config

Muc tieu:

- Cho phep config:

```js
adapter: {
  type: "wordpress",
  baseUrl: "https://example.com"
}
```

Tieu chi hoan thanh:

- Mock adapter van pass.
- WordPress adapter co error ro neu thieu `baseUrl`.
- Network call chi xay ra khi config chon `wordpress`.

## Phase 2E - Cleanup va release readiness

### Commit 032 - docs: add deployment guide for nginx static hosting

Muc tieu:

- Ghi cach build tren VPS.
- Ghi Nginx root dung.
- Ghi cach reload Nginx.

Files du kien:

```text
docs/deployment-nginx.md
```

### Commit 033 - test: add cli smoke tests

Muc tieu:

- Test command `--help`, `--version`, `build --project`.

Files du kien:

```text
test/cli.test.js
```

### Commit 034 - chore: prepare phase 2 complete status

Muc tieu:

- Cap nhat CHANGELOG.
- Cap nhat README.
- Danh dau Phase 2 complete.

Tieu chi hoan thanh:

- `npm test` pass.
- `npm run build:example` pass.
- VPS build pass.
- Browser xem duoc `tinsinhphat.local`.

## Checklist

```text
[ ] 021 chore: initialize git repository
[ ] 022 feat(cli): add help and version flags
[ ] 023 feat(cli): support build default project
[ ] 024 feat(core): add config loader
[ ] 025 feat(builder): copy public assets
[ ] 026 feat(example): add browser-ready shop styles
[ ] 027 feat(template): add basic shop template
[ ] 028 feat(cli): add create command
[ ] 029 feat(wordpress): add wordpress client draft
[ ] 030 feat(wordpress): add repository and normalizer draft
[ ] 031 feat(adapter): wire wordpress adapter behind config
[ ] 032 docs: add deployment guide for nginx static hosting
[ ] 033 test: add cli smoke tests
[ ] 034 chore: prepare phase 2 complete status
```

## Moc nhin thay thanh qua

- Sau commit 026: browser hien Basic Shop co giao dien dep hon.
- Sau commit 028: tao project moi bang CLI.
- Sau commit 031: bat dau co duong vao WordPress adapter.
- Sau commit 034: Phase 2 san sang de chuyen sang adapter WooCommerce hoac monorepo extraction.
