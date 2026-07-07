# WPSC Static Runtime, Data, And Navigation Notes

Ngày ghi chú: 2026-07-07

## Mục tiêu

WPSC vẫn giữ mục tiêu chính:

```text
Public website = static HTML/CSS/JS/JSON
Nginx serve trực tiếp file tĩnh
Không dùng Node/PHP để render public page khi visitor truy cập
```

Các trao đổi trong ghi chú này tập trung vào:

- Data model không bê nguyên mô hình `wp_posts`.
- Public router vẫn là `domain/slug`.
- `dist` public phải phẳng để Nginx serve trực tiếp.
- Khi build mỗi route tạo cả full HTML, fragment HTML và route JSON.
- Navigation sau lần load đầu có thể được tăng tốc bằng fragment.
- Widget động như sản phẩm bán chạy, sản phẩm xem gần đây cần xử lý riêng.

## WordPress chỉ là nguồn nhập liệu

WordPress gom nhiều loại dữ liệu vào `wp_posts`, gồm:

- post
- page
- product
- attachment/image
- revision
- nav item
- custom post type

WPSC không nên bê nguyên mô hình này vào framework. Sau khi sync từ WordPress/WooCommerce, dữ liệu nên được normalize lại theo domain rõ ràng.

Đề xuất cấu trúc nội bộ:

```text
data/sites/{siteId}/content/
  pages/
  posts/
  products/
  taxonomies/
  media/
  menus/
  users/
  seo/
```

Ví dụ:

```text
data/sites/tinsinhphat/content/pages/home.json
data/sites/tinsinhphat/content/posts/thu-webhook-node-js.json
data/sites/tinsinhphat/content/products/hop-nap-cai-tsp01.json
data/sites/tinsinhphat/content/media/logo.json
data/sites/tinsinhphat/content/taxonomies/product_cat.json
data/sites/tinsinhphat/content/menus/main-menu.json
```

Adapter WordPress/WooCommerce chịu trách nhiệm chuyển:

```text
wp_posts + wp_postmeta + wp_terms + RankMath + ACF + WooCommerce
        ↓
WPSC normalized data
```

Renderer và builder chỉ nên hiểu data model của WPSC:

```text
Page
Post
Product
Media
Taxonomy
Menu
Layout
Component
Route
```

## Router public không đổi

Đã chốt từ trước:

```text
domain/slug
```

Không dùng prefix public như:

```text
/post/slug
/page/slug
/product/slug
/category/slug
```

Ví dụ public URL:

```text
/                         -> homepage
/gioi-thieu               -> page
/thu-webhook-node-js      -> post
/hop-nap-cai-tsp01        -> product
/decal-giay               -> category/product_cat
```

Dữ liệu bên trong có thể phân loại rõ, nhưng URL public vẫn phẳng.

Route record nội bộ nên có dạng:

```json
{
  "path": "/hop-nap-cai-tsp01",
  "contentType": "product",
  "contentId": "product:123",
  "layoutId": "layout:product-default"
}
```

Build flow:

```text
route.path
  -> contentType + contentId
  -> load normalized data
  -> load layoutId
  -> render HTML/static outputs
```

## Vì sao dist public phải phẳng

Với mục tiêu browser/Nginx truy cập thẳng file tĩnh, public output trong `dist` phải phẳng theo route public.

Mô hình đúng:

```text
Browser
  -> Nginx
    -> dist/index.html
    -> dist/gioi-thieu.html
    -> dist/hop-nap-cai-tsp01.html
    -> dist/storefront.css
```

Không dùng mô hình:

```text
Browser
  -> Node server
    -> đọc manifest
    -> đọc HTML
    -> trả response
```

Nginx config đơn giản:

```nginx
location / {
  try_files $uri $uri.html =404;
}
```

Vì vậy public `dist` nên là:

```text
dist/
  index.html
  gioi-thieu.html
  hop-nap-cai-tsp01.html
  decal-giay.html
  bai-viet-a.html
  storefront.css
  style.css
  assets/
  data/
  fragments/
  .wpsc/
    manifest.json
```

Nhìn từ góc dev, `dist` phẳng có thể hơi lẫn lộn vì page/post/product/category nằm cùng tầng. Nhưng `dist` không phải source of truth. `dist` là output tối ưu cho Nginx/browser.

Logic cho dev/admin/builder nằm ở:

```text
data/sites/{siteId}/content/
data/sites/{siteId}/routes/index.json
dist/.wpsc/manifest.json
```

## Manifest dùng để debug/admin, không phục vụ public runtime

`manifest.json` có thể map route với source/content/layout:

```json
{
  "/hop-nap-cai-tsp01": {
    "type": "product",
    "contentId": "product:123",
    "sourceFile": "data/sites/tinsinhphat/content/products/hop-nap-cai-tsp01.json",
    "publicFile": "dist/hop-nap-cai-tsp01.html",
    "layoutId": "layout:product-default"
  }
}
```

Manifest dùng cho:

- builder/admin
- debug
- rebuild dependency
- sitemap/deploy tooling
- kiểm tra route conflict

Visitor truy cập public site không cần đọc manifest.

## Output mỗi route khi build

Chốt: khi build mỗi route, WPSC nên tạo cả 3 output:

```text
/{slug}.html
/fragments/{slug}/main.html
/data/routes/{slug}.json
```

Ví dụ product:

```text
dist/
  product-a.html
  fragments/
    product-a/
      main.html
  data/
    routes/
      product-a.json
```

Với homepage:

```text
dist/
  index.html
  fragments/
    index/
      main.html
  data/
    routes/
      index.json
```

Vai trò từng file:

```text
product-a.html
  -> full static page cho lần truy cập đầu, SEO, fallback khi JS tắt

fragments/product-a/main.html
  -> chỉ chứa vùng <main>, dùng cho enhanced navigation

data/routes/product-a.json
  -> metadata/runtime data để update title/meta/init widget/variation/cart
```

## Route JSON đã có, fragment chưa có

Hiện tại framework đã có output:

```text
dist/data/routes/{slug}.json
dist/data/manifest.json
```

Code liên quan:

```text
src/data/writeRouteDataOutputs.js
src/data/createRouteDataPayload.js
```

Test hiện có đã kiểm tra các file như:

```text
dist/data/routes/index.json
dist/data/routes/iphone-15.json
dist/data/routes/ui-storefront-demo.json
```

Phần chưa có:

```text
dist/fragments/{slug}/main.html
```

Đây là phase cần bổ sung nếu làm enhanced navigation.

## Static MPA + Enhanced Navigation

Không làm SPA public theo kiểu tải `app.js` lớn rồi JS router render mọi trang.

Public site vẫn là multi-page static site:

```text
/
/gioi-thieu
/san-pham-a
/danh-muc-a
/bai-viet-a
```

Nhưng sau lần load đầu, có thể tăng tốc navigation bằng JS nhỏ:

```text
User đang ở /product-a
Click /product-b
  -> JS intercept link nội bộ
  -> fetch /fragments/product-b/main.html
  -> fetch /data/routes/product-b.json
  -> replace <main>
  -> update document.title/meta/canonical
  -> history.pushState()
```

Nếu JS lỗi hoặc link không phù hợp, browser fallback về reload full page như bình thường.

Tên hướng kiến trúc:

```text
Static MPA + Enhanced Navigation
```

Không phải SPA thuần. Đây là static site có lớp tăng tốc điều hướng sau khi trang đầu đã load.

## Vì sao giữ cả fragment và route JSON

Không nên tích hợp toàn bộ data thẳng vào fragment.

`/fragments/{slug}/main.html`:

- HTML đã render sẵn.
- Browser chỉ thay DOM.
- Không cần client render component.
- Phù hợp static build.

`/data/routes/{slug}.json`:

- Metadata route.
- SEO/head data.
- Runtime data.
- Product variation data.
- Gallery data.
- Breadcrumb.
- Related routes.
- Cart/add-to-cart/search/filter data.
- Builder/admin/debug.

Khi enhanced navigation:

```text
click /product-b
  fetch /fragments/product-b/main.html
  fetch /data/routes/product-b.json
  replace <main>
  update title/meta/canonical
  init product variation/gallery/cart
  history.pushState()
```

Có thể để JSON trỏ tới fragment:

```json
{
  "path": "/product-b",
  "type": "product",
  "fragment": "/fragments/product-b/main.html",
  "title": "Product B",
  "seo": {},
  "runtime": {}
}
```

Hoặc để fragment trỏ về route data:

```html
<main id="wpsc-main" data-route="/data/routes/product-b.json">
  ...
</main>
```

Kết luận: fragment để thay HTML, route JSON để hiểu trang và khởi tạo logic.

## Admin builder có thể là SPA, public site không

Public site:

```text
static multi-page HTML
progressive enhancement bằng JS nhỏ
```

Admin builder:

```text
/admin
/admin/builder
/admin/layouts
```

Admin builder có thể là SPA vì cần:

- kéo thả
- state phức tạp
- preview
- login/admin API
- không cần SEO

Public site không nên là SPA vì:

- first load nặng hơn
- SEO phức tạp hơn
- phụ thuộc JS nhiều hơn
- lỗi JS có thể làm site trắng
- mất lợi thế Nginx serve static HTML vài chục ms

## Tốc độ

Nếu browser load file tĩnh chỉ vài chục ms thì HTML layer đã rất tốt.

Tối ưu tiếp nên tập trung vào:

- Nginx cache header.
- Gzip/Brotli.
- HTTP/2 hoặc HTTP/3.
- Giảm số request.
- Ảnh WebP/AVIF.
- Lazy-load ảnh dưới fold.
- Preload hero image.
- Critical CSS nếu thật sự cần.
- CDN nếu user ở xa VPS.

Nguyên tắc:

```text
Public runtime phải nhanh nhất và đơn giản nhất.
Nginx -> static file -> browser.
```

## Widget động

Một số block không thể static hoàn toàn cho mọi user.

### Sản phẩm bán chạy

Có thể xử lý bằng static snapshot trước:

```text
/data/widgets/best-sellers.json
```

Build homepage/category đọc snapshot này để render sẵn product cards.

Sau này có thể cập nhật bằng:

- cron
- webhook
- WooCommerce report/order data
- rebuild route liên quan

Nếu cần realtime hơn, browser có thể fetch endpoint/API riêng, nhưng phase đầu nên giữ static snapshot.

### Sản phẩm xem gần đây

Nên xử lý client-side theo từng visitor.

Luồng:

```text
User xem product-a
  -> JS lưu productId/slug vào localStorage

Block Recently Viewed
  -> đọc localStorage
  -> fetch product card data từ /data/routes/{slug}.json hoặc /data/products/{id}.json
  -> render danh sách nhỏ
```

HTML ban đầu chỉ cần placeholder:

```html
<section data-widget="recently-viewed"></section>
```

### Sản phẩm liên quan

Có thể build tĩnh.

Lúc build product page:

- lấy cùng `product_cat`
- cùng tag
- cùng thuộc tính
- hoặc Woo related nếu API có

Render sẵn trong full HTML và fragment.

Tóm tắt:

```text
Best sellers
  -> static snapshot trước, dynamic API sau nếu cần

Recently viewed
  -> client-side localStorage

Related products
  -> static build theo product/category
```

## Quyết định đã chốt trong phần này

- Data WPSC nên normalize, không bê nguyên `wp_posts`.
- Public router vẫn là `domain/slug`.
- Public `dist` phải phẳng để Nginx serve trực tiếp.
- `dist` là output, không phải source of truth.
- Logic phân loại nằm trong `data/` và manifest.
- Visitor không đọc manifest khi truy cập page.
- Khi build mỗi route tạo:
  - full HTML: `/{slug}.html`
  - fragment: `/fragments/{slug}/main.html`
  - route JSON: `/data/routes/{slug}.json`
- Route JSON hiện đã có.
- Fragment `main.html` chưa có, sẽ là phần cần bổ sung sau.
- Public site không làm SPA thuần.
- Hướng đúng là Static MPA + Enhanced Navigation.
- Giữ riêng fragment HTML và route JSON.
- Admin builder có thể là SPA.
- Dynamic widgets phải hydrate nhỏ, không phá static runtime.

