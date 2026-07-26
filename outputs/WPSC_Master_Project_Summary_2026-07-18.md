# WPSC Master Project Summary - 2026-07-18

## Muc Dich

File nay tong hop lai toan bo tien trinh du an WPSC tu luc khoi dau den thoi diem hien tai.

No gom cac quyet dinh lon, nhung phan da code, nhung phan da tam chot, nhung phan con no, va huong tiep tuc sau khi du an da co:

- static commerce core
- WordPress/WooCommerce real adapter
- storefront Tin Sinh Phat
- account/cart/checkout runtime
- webhook rebuild tu WordPress
- nen tang builder/theme de tach tiep ve sau

## Tam Nhin Da Chot

WPSC khong chi la mot website tinh rieng cho Tin Sinh Phat.

Muc tieu dai han:

```text
WPSC = static commerce framework cho WordPress/WooCommerce
```

Trong do:

```text
WordPress/WooCommerce = nguon du lieu va noi quan tri noi dung/san pham/don hang
WPSC = build ra static HTML/CSS/JS/JSON
Nginx/CDN = serve public site truc tiep tu file tinh
Runtime WPSC = chi xu ly cac phan dong nhu login, account, cart, checkout, order
Builder/Admin = cong cu quan tri layout/theme, khong phai public renderer
```

Nguyen tac quan trong nhat:

```text
Public route = domain/slug
Public output = file tinh phang trong dist
Public visitor khong can WordPress/PHP/Node de render page
```

## Route Contract

Da chot giu route phang:

```text
/                         -> homepage
/gioi-thieu               -> page
/bai-viet-a               -> post
/danh-thiep-in-offset     -> product
/in-an-catalogue          -> product_cat/category/tag archive
/cart                     -> static shell + runtime JS
/checkout                 -> static shell + runtime API
/account                  -> static shell + runtime API
```

Khong dung public prefix:

```text
/product/slug
/category/slug
/post/slug
```

Ly do:

- SEO slug ngan, dung y tu dau du an.
- Nginx co the serve truc tiep `dist/slug.html`.
- `dist` co the nhin hoi lon xon luc dev, nhung day la output cho browser, khong phai source of truth.

## Core Pipeline Da Xay

Pipeline hien tai:

```text
CLI
-> load config
-> adapter fetch/normalize data
-> content graph
-> route planner
-> theme/layout renderer
-> build static outputs
-> dist/*.html + fragments + route JSON + manifests
```

Da co:

- ESM package.
- Node engine `>=20`.
- Config loader va `.env` theo project.
- Mock adapter.
- WordPress adapter.
- WooCommerce adapter.
- WordPress + WooCommerce combined adapter.
- Content graph.
- Router flat slug.
- SEO output.
- Sitemap/robots.
- Static builder.
- CLI build/serve/dev/clean/doctor/deploy rsync/webhook.
- Incremental build theo changed item.
- Public route data JSON.
- Fragment HTML cho SPA-like navigation sau lan load dau.

## Data Source Va Adapter

### WordPress Adapter

Da co:

- pages
- posts
- custom post types
- taxonomies/terms
- media
- menus
- ACF
- Rank Math SEO
- Application Password/Bearer auth qua env

Nguyen tac:

```text
Renderer/theme/builder khong goi WordPress truc tiep.
Adapter normalize ve WPSC content model.
```

### WooCommerce Adapter

Da co:

- products
- product categories
- product tags
- variations
- price/regular/sale
- stock/SKU
- product images
- product terms
- product Rank Math SEO

Quyet dinh quan trong ve variable product:

```text
Variation khong la route tinh rieng.
Variation duoc tich hop vao product cha.
Khach chon variation tren product detail truoc khi them vao gio/bao gia.
```

## Output Data Contract

Khi build route, WPSC tao ca 3 dang:

```text
dist/slug.html
dist/fragments/slug/main.html
dist/data/routes/slug.json
```

Ly do giu ca fragment va JSON:

- Full HTML cho lan load dau, SEO, browser/Nginx.
- Fragment HTML cho navigation nhanh sau lan load dau.
- Route JSON cho builder/admin/runtime/doc/debug.

Dist van phang o public root, con du lieu/debug nam trong:

```text
dist/data/
dist/fragments/
dist/.wpsc/
```

## Storefront Tin Sinh Phat

Ban dau co builder direction, nhung sau do da chot lam hard-coded storefront truoc de co website ban hang hoat dong that.

Ly do:

- Du lieu WP/Woo that da co.
- Builder neu lam truoc se rat lon, de cham tien do.
- Storefront hard-code giup kiem soat SEO, layout, product, cart, checkout nhanh hon.

Da lam:

- Top header.
- Main header.
- Dark/light mode.
- Homepage.
- Category archive.
- Product detail.
- Cart.
- Checkout.
- Thank-you.
- Search page.
- Account page.
- 404 page.
- Footer.
- Product cards/category cards.
- Breadcrumb category/product cha-con.
- Related products.
- Recently viewed products.
- Product tabs.
- Product JSON-LD/schema.
- Search dynamic/infinite style theo index.
- SPA-like enhanced navigation bang route JSON + fragment.

Design direction:

- Width content chinh: `1340px`.
- Font system OS.
- Font size nen: `13pt`.
- Mau chinh site: xanh logo, uu tien `#0c6349`.
- Card hover nhe.
- Hinh anh lazy load.
- Heading public page da dieu chinh ve nhe hon.

## Cart/Checkout/Order Flow

Da lam:

- Cart route static shell.
- Cart item quantity input.
- Coupon apply/clear.
- Checkout page.
- Billing/shipping fields.
- Shipment fee tinh vao tong.
- Payment method trong "Don hang cua ban".
- Terms checkbox.
- Privacy text/link.
- Submit order qua runtime `/api/checkout`.
- Runtime tao Woo order server-side.
- Thank-you page.
- QR chuyen khoan VietQR direction.
- Track order lookup.

Nguyen tac da fix:

```text
Neu /api/checkout loi:
  khong redirect thank-you gia
  khong clear cart/coupon

Neu /api/checkout thanh cong:
  luu last order
  clear cart/coupon
  dieu huong thank-you
```

Con can truoc public:

- Chot bank code, account number, account name.
- Test 1 order that co chu y trong Woo.
- Rotate secrets da tung paste trong qua trinh dev.

## Account/User/Auth Flow

Huong da chot:

```text
Browser khong giu WP/Woo credential.
wp-static runtime giu session cookie.
WordPress/API bridge xac thuc user.
wp-static dung session.userId de lay du lieu user.
Moi du lieu tra ve browser phai thuoc dung session.userId.
```

Da lam:

- `/account` static shell.
- Login/logout.
- Header doi trang thai account theo session.
- Runtime session `wpsc_session`.
- `/api/account/me`.
- Orders list.
- Order detail.
- Address view/update.
- Profile/change password direction.
- Product link trong order detail.
- Register/verify/lost password/reset/resend verification flow.
- Plugin auth/mail direction voi Zoho.

Nguyen tac bao mat:

```text
Khong tin userId tu browser.
Order detail phai check order.customer_id === session.userId.
Woo key/secret va WP app password chi o server/runtime/plugin.
```

Backlog user/auth:

- Hoan thien email templates.
- Test email that: register, verify, forgot, reset.
- Rate limit auth endpoints.
- Admin setting/mail log cho plugin.

## WordPress Plugins Da Tao/Theo Huong

### Auth/Mail Bridge

Dung cho:

- login
- register
- verify email
- lost/reset password
- resend verification
- Zoho/wp_mail bridge

Da test co cau hinh Zoho va plugin active.

Can nho:

- PHP lint can chay tren moi truong co PHP.
- Email production phai test that.

### WPSC Webhook Bridge

Plugin moi:

```text
integrations/wordpress/wpsc-webhook-bridge/
```

Chuc nang:

- Bat post/page/product create/update/delete/publish/trash.
- Bat `product_variation` va map ve product cha.
- Bat category/tag/product_cat/product_tag create/update/delete.
- Gui webhook ve WPSC receiver.
- Status endpoint.
- Test endpoint.
- Last result.
- Queue/debounce production.
- Immediate mode cho dev.

Config quan trong:

```php
define('WPSC_WEBHOOK_TARGET_URL', 'http://192.168.1.4:8788/webhook/rebuild');
define('WPSC_WEBHOOK_SECRET', 'secret-giong-wp-static');
define('WPSC_WEBHOOK_SEND_IMMEDIATELY', true);
```

Trong dev local hien tai:

```text
WordPress o VPS/LAN
wp-static receiver chay tren Mac
Mac LAN IP: 192.168.1.4
Receiver port: 8788
```

Lenh receiver:

```bash
cd /Users/tienlavan/Documents/Codex/2026-07-02/hi
node src/cli/index.js webhook --project examples/basic-shop --port 8788
```

Log mong doi:

```text
Webhook received: update product_cat in-an-catalogue
Webhook rebuild started: woocommerce:update:term:product_cat:in-an-catalogue
Build progress: Loading project config: ...
Build progress: Source fetch and compile started (fresh data, route render cache disabled)
Build progress: Source fetch and compile finished: ...
Build progress: Build plan ready: ...
Build progress: Writing ... HTML pages
Build progress: Writing fragments ...
Build progress: Writing route JSON ...
Build progress: Build finished in ...
Webhook rebuild finished
```

Quyet dinh moi nhat:

```text
Khi save trong WP, terminal phai bao nhan webhook ngay.
Sau do wp-static fetch du lieu that, dua vao queue build, va build route lien quan.
```

## Webhook Rebuild Consistency

Da phat hien va fix cac loi quan trong:

1. WordPress target `localhost` sai khi receiver chay tren Mac.

Dung:

```text
http://192.168.1.4:8788/webhook/rebuild
```

2. Receiver ban dau crash khi GET `/health`.

Da them:

```text
GET /health -> {"ok":true}
```

3. Receiver ban dau cho build xong moi response, WordPress timeout.

Da doi:

```text
POST /webhook/rebuild -> 202 queued ngay
Build chay nen
```

4. Webhook build ban dau co the dung content cache cu.

Da doi webhook build:

```text
freshContent: true
```

5. Webhook build ban dau co the dung route render cache cu, gay "cham mot nhip".

Da doi webhook build:

```text
disableRouteRenderCache: true
```

6. Da test voi dong:

```text
dong kiem tra WPSC_TEST_CATEGORY_2045
```

Ket qua:

```text
WP API co dong test
Woo client co dong test
Build memory co dong test
dist/data/routes/in-an-catalogue.json co dong test
dist/in-an-catalogue.html co dong test
dist/fragments/in-an-catalogue/main.html co dong test
```

Ket luan:

```text
WP -> webhook -> fetch fresh -> build -> HTML/fragment/JSON da dung.
Neu browser khong thay thi kiem tra serve/browser cache/runtime navigation.
```

## Builder Direction

Da co 2 vong trao doi lon.

### Huong ban dau

Muon builder gan giong Flatsome:

- sidebar component
- preview live
- drag/drop vao preview
- row/column
- component con trong component lon
- xoa/sap xep component
- user tao layout header/footer/page
- user tao component composite

Da thu mot phan trong builder UI nhung thay:

```text
Builder that su rat lon.
Neu lam builder truoc se cham website ban hang.
```

### Huong da chot hien tai

```text
Hard-code storefront de co web ban hang truoc.
Builder la phase dai han.
Builder sau nay la static template builder, khong phai runtime renderer.
```

Builder dung de tao template cho:

- home
- page
- post
- product
- product_cat
- tag/category archive
- cart shell
- checkout shell
- account shell

Pipeline builder tuong lai:

```text
Builder template JSON
  + WPSC normalized data
  + theme components
  -> build static HTML
```

Admin/builder chi danh cho admin login, khach public khong thay.

## Theme System Direction

Hien tai theme Tin Sinh Phat nam trong:

```text
examples/basic-shop/theme/
```

Da bat dau tach component:

```text
components/account/
components/archive/
components/category/
components/commerce/
components/footer/
components/header/
components/navigation/
components/product/
components/sections/
components/shared/
```

Nhung muc tieu dai han:

```text
Theme phai doc lap, tai su dung cho site khac.
Nguoi dung co the tu tao theme, upload theme, chon theme.
```

Huong cau truc:

```text
themes/
  tinsinhphat-storefront/
    theme.json
    layouts/
    components/
    styles/
    assets/

sites/
  tinsinhphat/
    wpsc.config.js
    .env
    public/
```

Can co sau nay:

- `create-theme`.
- Theme manifest.
- Theme settings schema.
- Upload/preview/activate theme trong admin.
- Validate theme before use.

## Performance Va Navigation

Da co:

- Static HTML cho first load.
- Enhanced navigation sau do fetch route JSON + fragment.
- Prefetch khi hover/focus/touch.
- Content transition nhe, muc tieu cam giac duoi `80ms`.
- Header/footer khong animate.

Quyet dinh:

```text
Khong can SPA full.
Dung static page first load, sau do SPA-like navigation bang fragment/JSON khi hop ly.
```

Widget dong nhu:

- san pham ban chay
- san pham da xem
- recently viewed

Xu ly theo huong:

- data tinh cho best sellers neu co nguon.
- recently viewed bang localStorage/runtime client.
- Khong de widget dong pha SEO/static contract.

## Deployment/VPS/Local

VPS:

```text
192.168.1.181
user: tienlavan
project: /home/data/sites/wp-static
```

Da tung sync len VPS bang rsync.

Hien giai doan test local:

```text
Site static/runtime local: http://localhost:8787
Webhook receiver local: http://localhost:8788/webhook/rebuild
WordPress API: https://api.tinsinhphat.com
```

Neu chay receiver tren Mac va WordPress o VPS cung LAN:

```text
WordPress target khong dung localhost.
Phai dung IP LAN cua Mac.
```

## Production Readiness

Trang thai gan nhat:

```text
READY FOR INTERNAL PILOT
NOT YET for public broad sales
```

Ly do chua public rong:

- QR ngan hang con can cau hinh that.
- Can test order Woo that tu browser.
- Can test email that.
- Can rotate secrets da tung paste.
- Can full build va smoke mobile/product/cart/checkout.

Da pass:

- Static route smoke.
- Account privacy boundary.
- Runtime commerce tests.
- Checkout payload mapping.
- Order ownership check.
- 404.
- Search.
- Cart/checkout/thank-you shell.

Can lam truoc public:

```text
1. Cau hinh VietQR that.
2. Tao 1 order test that.
3. Test register/verify/forgot/reset email that.
4. Rotate Woo/WP/bridge/Zoho secrets.
5. Full build.
6. Smoke test mobile cac route chinh.
```

## Test Status Gan Nhat

Da chay thanh cong:

```text
node --test test/webhookWorkflow.test.js
pass 4/4
```

Truoc do:

```text
node --test test/commerceRuntime.test.js
pass 13/13
```

Luu y:

```text
test/incrementalBuild.test.js hien fail trong lan chay gan nhat vi no con ky vong mock route /iphone-15, /dien-thoai, trong khi project dang dung du lieu that Tin Sinh Phat.
Khong xem day la loi webhook/progress moi, nhung can tach lai fixture/mock test sau.
```

PHP lint plugin:

```text
May local khong co php command.
Can chay php -l tren VPS/WordPress co PHP.
```

## Cac File Tracking Quan Trong

```text
ARCHITECTURE.md
CHANGELOG.md
docs/
outputs/WPSC_Revised_Master_Roadmap.md
outputs/WPSC_Hardcoded_Storefront_Commerce_Roadmap.md
outputs/WPSC_Static_Runtime_Data_And_Navigation_Notes.md
outputs/WPSC_Static_Builder_Architecture_Notes.md
outputs/WPSC_Builder_Template_Architecture_Summary.md
outputs/WPSC_Theme_System_User_Theme_Requirements.md
outputs/WPSC_Account_Auth_User_Data_Direction.md
outputs/WPSC_Account_User_Flow_Backlog.md
outputs/WPSC_Runtime_Backend_Audit_Checklist.md
outputs/WPSC_Production_Readiness_Checklist.md
outputs/WPSC_Webhook_Bridge_Install_VPS.md
```

File hien tai la ban tong hop moi:

```text
outputs/WPSC_Master_Project_Summary_2026-07-18.md
```

## Huong Tiep Theo De Lam

Thu tu hop ly sau khi webhook tam on:

### 1. Tach runtime backend thanh module

Da bat dau tach backend runtime khoi `src/runtime/commerce/createCommerceRuntime.js`.

Cau truc moi:

```text
src/runtime/api/
src/runtime/auth/
src/runtime/account/
src/runtime/cart/
src/runtime/checkout/
src/runtime/order/
src/runtime/session/
src/runtime/commerce/
```

Y nghia:

```text
api/       -> helper response/path/json
auth/      -> login/logout/register/verify/reset handlers
account/   -> me/orders/address/profile/password handlers
cart/      -> cart API handlers
checkout/  -> checkout API handler
order/     -> order lookup handlers
session/   -> public session exports
commerce/  -> runtime/server/service compatibility layer
```

Da kiem:

```text
node --test test/commerceRuntime.test.js
pass 13/13
```

Phan con lai:

```text
src/runtime/enhanced-navigation.js van con la frontend runtime lon.
Can tach tiep thanh frontend modules: cart, checkout, account, product, search, navigation.
```

### 2. On dinh webhook dev loop

- Rsync plugin webhook moi len WordPress.
- Bat `WPSC_WEBHOOK_SEND_IMMEDIATELY`.
- Anh tu mo terminal receiver de nhin log.
- Test lai save category/product/page.
- Ghi nhan thoi gian build tung loai.

### 3. Toi uu webhook incremental data

Hien tai webhook da dung nhung con hoi cham vi fetch fresh data rong.

Huong toi uu:

```text
WP save -> webhook received
-> fetch dung item changed theo id/type
-> update normalized cache item
-> plan affected routes
-> build routes lien quan
```

Muc tieu:

```text
category/page/post: 3-10s
product: 8-20s
full build: 40-60s
```

### 4. Tach component/theme

Sau khi storefront on dinh:

- Giam code tap trung trong storefront shell.
- Tach theme Tin Sinh Phat thanh package/structure rieng.
- Ghi ro theme contract.
- Chuan bi cho multi-site/user theme.

### 5. Hoan thien production gate

- QR bank thật.
- Order test thật.
- Email test thật.
- Rotate secret.
- Mobile smoke.

### 6. Builder quay lai sau

Sau khi site ban hang chay on:

- Template builder.
- Header/footer builder.
- Row/column/slot.
- User composite component.
- Upload/select theme.

## Cap Nhat: Frontend Runtime Split

Ngay 2026-07-18 bat dau tach `src/runtime/enhanced-navigation.js` thanh cac module frontend nho hon.

Da tach lop helper/logic dung chung:

```text
src/runtime/frontend/shared/text.js
src/runtime/frontend/shared/currency.js
src/runtime/frontend/cart/cartStore.js
src/runtime/frontend/checkout/bankTransfer.js
src/runtime/frontend/product/variantUtils.js
src/runtime/frontend/search/searchUtils.js
src/runtime/frontend/navigation/path.js
src/runtime/frontend/account/accountState.js
```

Thay doi runtime public:

- `wpsc-enhanced-navigation.js` chuyen thanh ES module entry.
- `renderPage()` load bang `<script type="module">`.
- `buildSite()` copy `src/runtime/frontend/` ra `dist/frontend/`.
- Cart storage/coupon, account session normalize, QR bank, search helper, product variation helper, navigation path helper da tach khoi file entry.

Huong tach tiep:

- `frontend/account/`: tach render login/register/orders/address/profile.
- `frontend/cart/`: tach render cart page va coupon UI.
- `frontend/checkout/`: tach checkout submit, shipping, thank-you QR.
- `frontend/product/`: tach variation state, recently viewed, product tabs/gallery.
- `frontend/search/`: tach render search page, filter, pagination/load more.
- `frontend/navigation/`: tach prefetch, fragment swap, transition.

Nguyen tac:

```text
enhanced-navigation.js chi nen la entry/orchestrator.
Moi module giu mot nhom hanh vi ro rang.
Khong doi route public, khong doi dist phang.
Khi build route, van copy du frontend runtime module de browser import duoc.
```

## Cap Nhat: Build Architecture Folder Split

Ngay 2026-07-18 da bat dau tach cac lop build orchestration thanh folder ro nghia hon.

Folder da co that:

```text
src/webhook/
src/incremental/
src/cache/
src/planner/
src/graph/
src/watcher/
src/queue/
src/invalidate/
src/progress/
```

Mapping moi:

```text
src/graph/createContentGraph.js
src/graph/createRouteDependencyGraph.js

src/planner/parseChangedItem.js
src/planner/planIncrementalBuild.js

src/queue/createRebuildQueue.js

src/watcher/createWatchTargets.js

src/progress/createProgressReporter.js

src/invalidate/createFreshBuildOptions.js
```

Bridge tuong thich nguoc van giu:

```text
src/incremental/createRouteDependencyGraph.js -> src/graph/createRouteDependencyGraph.js
src/incremental/parseChangedItem.js -> src/planner/parseChangedItem.js
src/incremental/planIncrementalBuild.js -> src/planner/planIncrementalBuild.js
src/webhook/createRebuildQueue.js -> src/queue/createRebuildQueue.js
src/dev-server/createWatchTargets.js -> src/watcher/createWatchTargets.js
```

Nguyen tac:

```text
webhook chi nhan request va map payload.
queue chi serialize rebuild.
planner chi tinh affected routes/pages.
graph chi bieu dien quan he content/route.
watcher chi theo doi file dev.
invalidate chi dong goi chinh sach build fresh/cache bust.
progress chi chuan hoa event tien trinh.
```

## Quyet Dinh Can Nho

```text
1. Public site la static.
2. Route public luon domain/slug.
3. WordPress/WooCommerce la source data, khong la renderer.
4. Product variation nam trong product cha.
5. Moi route co HTML + fragment + JSON.
6. Runtime chi xu ly dong: auth/account/cart/checkout/order.
7. Browser khong bao gio thay credential nhay cam.
8. Builder la admin tool build template tinh, khong phai runtime public renderer.
9. Hard-coded storefront la giai doan ra web that truoc, khong phai architecture cuoi cung.
10. Webhook dev phai bao nhan ngay, build queue sau do.
```
