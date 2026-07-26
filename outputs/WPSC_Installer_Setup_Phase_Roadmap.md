# WPSC Installer / Setup Phase Roadmap

## Ly do can lam som

Installer nen duoc xay dung som vi WPSC khong chi la mot site rieng le. Muc tieu dai han la dung framework nay de tao nhieu website tinh tu nhieu nguon WordPress/WooCommerce khac nhau. Neu khong co luong cai dat ro rang, moi domain moi se phai sua tay config, env, build, deploy va rat de sai.

Phase nay nen duoc uu tien truoc khi di sau vao account/user flow, vi no tao nen trai nghiem khoi tao du an moi: nhap domain, ket noi API, kiem tra du lieu, build lan dau va xem site tren browser.

## Muc tieu

- Tao mot luong install/setup ro rang cho website moi.
- Giam viec sua tay `.env`, `wpsc.config.js`, output dir va site URL.
- Kiem tra ket noi WordPress/WooCommerce truoc khi build.
- Tao tai lieu cai dat de nguoi dung tu lam lai duoc.
- Chuan bi nen tang cho multi-site, multi-domain va reusable theme.

## Pham vi v1

### 1. Docs cai dat

File de xuat:

- `docs/INSTALL.md`
- cap nhat neu can: `docs/getting-started.md`

Noi dung can co:

- Yeu cau moi truong: Node, npm, server static, nginx neu deploy.
- Cach clone/copy project.
- Cach tao `.env`.
- Cach chon adapter: WordPress, WooCommerce, WordPress + WooCommerce, mock.
- Cach build lan dau.
- Cach preview local.
- Cach cau hinh virtual host voi flat route `domain/slug`.

### 2. `.env.example`

File de xuat:

- `.env.example`
- co the them `examples/basic-shop/.env.example` neu can tach theo project.

Bien toi thieu:

```bash
WPSC_WP_USERNAME=
WPSC_WP_APP_PASSWORD=
WPSC_WOO_CONSUMER_KEY=
WPSC_WOO_CONSUMER_SECRET=
WPSC_BUILDER_TOKEN=
WPSC_SITE_URL=http://example.local
WPSC_SITE_TITLE=
WPSC_OUTPUT_DIR=./dist
```

Ghi chu:

- Khong commit `.env` that.
- `.env.example` chi la mau.
- Woo key/secret chi can khi dung WooCommerce.
- WP app password chi can khi endpoint can auth.

### 3. Setup command toi thieu

Lua chon nhanh, don gian:

```bash
npm run setup:example
```

Hoac CLI:

```bash
npm run wpsc -- setup --project examples/basic-shop
```

Pham vi ban dau:

- Kiem tra file `.env` ton tai hay chua.
- Neu chua co, huong dan copy tu `.env.example`.
- Kiem tra `examples/basic-shop/wpsc.config.js`.
- In ra cac bien dang thieu.
- Khong can interactive prompt phuc tap o v1.

### 4. Doctor command

Command de xuat:

```bash
npm run wpsc -- doctor --project examples/basic-shop
```

Kiem tra:

- Node version.
- Config hop le.
- Output dir co the ghi.
- Public dir ton tai.
- Theme layouts ton tai.
- WordPress baseUrl co hop le.
- WooCommerce credentials co ton tai neu dung Woo adapter.
- Cac endpoint chinh co the goi duoc khi network cho phep:
  - `/wp-json/wp/v2/pages`
  - `/wp-json/wp/v2/posts`
  - `/wp-json/wc/v3/products`
  - categories/product categories/media neu bat.

Ket qua nen in dang checklist:

```text
OK Node >= 20
OK Config loaded
OK Theme layouts found
WARN Missing WPSC_WOO_CONSUMER_KEY
FAIL WooCommerce products endpoint returned 401
```

### 5. First build flow

Sau khi setup/doctor pass:

```bash
npm run build:example
npx serve examples/basic-shop/dist -l 8080
```

Ket qua can tao:

- `dist/index.html`
- route html phang: `dist/slug.html`
- alias folder neu server can: `dist/slug/index.html`
- `dist/data/routes/*.json`
- `dist/data/search-index.json`
- `dist/fragments/*/main.html`
- sitemap/robots neu da co cau hinh.

### 6. Deploy/local virtual host note

Can ghi ro quy tac:

- URL chuan van la `domain/slug`, khong co trailing slash.
- Thu muc `dist` co the phang de static server doc truc tiep.
- Neu nginx, can try file:

```nginx
try_files $uri $uri.html $uri/index.html =404;
```

Khong duoc ep redirect `/slug` sang `/slug/`.

## Commit de xuat

### Commit Install 01: docs and env sample

Noi dung:

- Them `docs/INSTALL.md`.
- Them `.env.example`.
- Ghi ro flow cai dat voi WP/Woo/API that.

Kiem tra:

```bash
test -f docs/INSTALL.md
test -f .env.example
```

### Commit Install 02: setup checker

Noi dung:

- Them script setup toi thieu.
- Them npm script `setup:example`.
- Kiem tra `.env`, config, output dir, theme files.

Kiem tra:

```bash
npm run setup:example
```

### Commit Install 03: doctor command

Noi dung:

- Them CLI doctor hoac mo rong doctor hien co.
- Report OK/WARN/FAIL.
- Kiem tra credentials va endpoint khi co network.

Kiem tra:

```bash
npm run wpsc -- doctor --project examples/basic-shop
```

### Commit Install 04: first-build guide and validation

Noi dung:

- Bo sung docs first build.
- Bo sung checklist build output.
- Ghi ro preview va nginx/vhost.

Kiem tra:

```bash
npm run build:example
npx serve examples/basic-shop/dist -l 8080
```

## Thu tu uu tien sau khi quay lai

1. Lam `docs/INSTALL.md` va `.env.example` truoc.
2. Them setup checker nho, khong over-engineer.
3. Them doctor command.
4. Sau khi install flow on, quay lai Account Phase 2:
   - `/account/orders`
   - `/account/edit-address`
   - checkout autofill
   - luu order history tu thank-you.

## Nguyen tac giu huong

- Setup phai phuc vu multi-site, khong hard-code rieng `tinsinhphat.local`.
- Theme storefront hien tai nen tro thanh preset reusable.
- Config site moi chi nen thay doi source, domain, credentials, site title va output.
- Khong dua secret vao git.
- Khi code route nao, build route do truoc; chi full build khi them route moi hoac thay doi core manifest/index.

