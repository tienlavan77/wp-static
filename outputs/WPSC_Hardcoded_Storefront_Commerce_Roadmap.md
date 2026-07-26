# WPSC Hard-coded Storefront Commerce Roadmap

Ngày tạo: 2026-07-13

## Quyết Định Hiện Tại

Mục tiêu ưu tiên thay đổi từ "xây UI Builder thật mạnh trước" sang:

```text
Ra một website thương mại hoạt động được trước.
Layout public storefront hard-code bằng code trước.
UI Builder giữ lại, nhưng không để builder chặn tiến độ ra web.
```

Lý do:

- Nguồn dữ liệu WordPress/WooCommerce thật đã có.
- Pipeline static, route, SEO, JSON data, fragment, adapter WP/Woo đã có nền.
- Nếu tiếp tục xây builder giống Flatsome trước, dự án sẽ biến thành "xây theme builder" thay vì "ra website bán hàng".
- Hard-code layout giúp kiểm soát nhanh SEO, performance, responsive, product variation, cart/checkout shell.

## Nguyên Tắc Thi Công

### 1. Route public không đổi

Toàn bộ public route vẫn theo hợp đồng:

```text
domain/slug
```

Không dùng:

```text
/product/slug
/category/slug
/post/slug
```

Output tĩnh vẫn ưu tiên flat file:

```text
dist/index.html
dist/gioi-thieu.html
dist/hop-nap-cai-tsp01.html
dist/decal-giay.html
```

### 2. Code trang nào, render lại trang đó

Khi làm UI từng trang, nguyên tắc là:

```text
Không rebuild toàn site nếu không cần.
Chỉ render lại route/file tĩnh của trang đang code và các asset liên quan.
```

Ví dụ:

- Code homepage -> render lại `dist/index.html`.
- Code product detail -> render lại 1 product route mẫu, ví dụ `dist/hop-nap-cai-tsp01.html`.
- Code product category -> render lại 1 taxonomy/product_cat route mẫu.
- Code CSS chung -> copy/build lại CSS asset, sau đó chỉ refresh các trang mẫu cần kiểm tra.
- Code header/footer chung -> render lại các route mẫu đại diện: homepage, product, category, page.

Ghi chú kỹ thuật:

- Nếu CLI incremental chưa đủ tiện, trước mắt có thể dùng script/dev helper riêng để build route mẫu.
- Full build chỉ dùng khi đổi data model/router/adapter hoặc trước khi kiểm tra release.

### 3. Static + dynamic tách rõ

Public SEO storefront là static:

- Homepage
- Product category
- Product detail
- Post/page
- Blog/category/tag
- Search index nếu cần
- Route JSON/fragment
- SEO/schema/breadcrumb

Commerce runtime là dynamic shell + API:

- Cart
- Checkout
- Login/register
- Account/user dashboard
- Order history
- Order detail
- Coupon/shipping/payment

Các trang động vẫn có route tĩnh shell, nhưng dữ liệu giao dịch gọi API runtime.

## Layout Chung Của Website

Mọi public page nên đi qua một layout shell thống nhất:

```text
Page Shell
├── Top Header
├── Main Header
├── Banner / Page Hero
├── Content Area
└── Footer
```

### Top Header

Vai trò:

- Hotline.
- Email.
- Liên kết nhanh.
- Thông báo ngắn.
- Có thể có link login/account/cart.

Yêu cầu:

- Nhẹ, gọn, không chiếm quá nhiều chiều cao.
- Desktop hiển thị đầy đủ.
- Mobile có thể rút gọn.

### Main Header

Vai trò:

- Logo.
- Main nav.
- Search.
- Cart icon/count.
- Account icon.
- Dark mode toggle nếu vẫn giữ.

Yêu cầu:

- Dùng component hard-code trước.
- Dữ liệu menu lấy từ WP menu nếu adapter đã có.
- Cart count lấy từ client cart runtime.

### Banner / Page Hero

Tùy loại trang:

- Homepage: hero/banner chính.
- Product category: tên danh mục, mô tả, breadcrumb.
- Product detail: không nhất thiết có banner lớn, ưu tiên product summary.
- Page/post: title + breadcrumb hoặc banner nếu có featured image.
- Cart/checkout/account: title đơn giản, không cần hero nặng.

### Content Area

Thay đổi theo loại trang:

- Home content.
- Product archive grid.
- Product detail.
- Post/page content.
- Blog/category listing.
- Cart shell.
- Checkout shell.
- Account shell.

### Footer

Vai trò:

- Logo/thông tin công ty.
- Menu footer.
- Chính sách.
- Hỗ trợ.
- Social.
- Copyright.

Yêu cầu:

- Hard-code layout trước.
- Data có thể lấy từ config/WP menu sau.

## Lộ Trình Chi Tiết

## Phase 1: Khóa Hướng Và Dọn Nền Storefront

Mục tiêu:

- Chốt hard-code layout public storefront.
- Không mở rộng UI Builder thêm trong phase này.
- Xác định route mẫu để kiểm tra từng loại trang.

Việc cần làm:

- Ghi roadmap này.
- Đánh dấu builder là phase dài hạn.
- Kiểm tra lại config thật cho `api.tinsinhphat.com`.
- Chọn route mẫu:
  - Homepage: `/`
  - Product detail: một sản phẩm có biến thể.
  - Product category: một `product_cat` cấp cao và một cấp con nếu có.
  - Page: một page thông thường.
  - Post: một bài viết.

Commit đề xuất:

```text
commit 001: docs(roadmap): define hard-coded storefront commerce roadmap
```

Kết quả kiểm tra:

- Có markdown roadmap.
- Có danh sách route mẫu để test.

## Phase 2: Storefront Shell Chung

Trạng thái: `IN PROGRESS`

Mục tiêu:

- Tạo shell chung cho toàn site.
- Mọi trang đi qua top header, main header, banner slot, content slot, footer.

Việc cần làm:

- Tạo hoặc chuẩn hóa các component:
  - `TopHeader`
  - `MainHeader`
  - `SiteBanner`
  - `Footer`
  - `PageShell`
- Dữ liệu header ban đầu:
  - Logo từ config.
  - Menu từ graph/menu nếu có, fallback hard-code.
  - Cart count placeholder từ JS runtime.
- Dữ liệu footer ban đầu:
  - Company info từ config.
  - Footer menu fallback.

Render/test tối thiểu:

- Render lại `dist/index.html`.

Commit đề xuất:

```text
commit 002: feat(storefront): add shared hard-coded page shell
```

Tiến trình 2026-07-13:

- Đã tạo hard-coded `storefrontShell` component.
- Đã có `TopHeader`, `MainHeader`, `Banner`, `Content Area`, `Footer`.
- Homepage mock đã render qua shell mới.
- Product detail mock đã render qua shell mới.
- Đã tắt template builder trong example config bằng `templates.enabled: false` để hard-code layout được ưu tiên trong giai đoạn MVP.
- Đã build lại `examples/basic-shop/dist`.

## Phase 3: Homepage Hard-code Layout

Mục tiêu:

- Có homepage nhìn như website thật, không còn blank/builder demo.

Thành phần homepage:

- Top header.
- Main header.
- Hero/banner.
- Product categories nổi bật.
- Featured products.
- New products hoặc best-selling placeholder.
- Brand/trust section.
- Blog/news section nếu có dữ liệu.
- Footer.

Dữ liệu:

- Dùng graph/content data đã build.
- Nếu chưa có best-selling thật, dùng featured/newest products fallback.

Render/test:

- Chỉ render `dist/index.html`.

Commit đề xuất:

```text
commit 003: feat(home): hard-code commerce homepage layout
```

## Phase 4: Product Category / Archive Layout

Mục tiêu:

- Product category route chạy ổn.
- Category cấp cao không bị 404.
- Product grid đủ dùng.

Thành phần:

- Breadcrumb.
- Category title.
- Category description.
- Child categories nếu có.
- Product grid.
- Sort/filter client-side cơ bản nếu đủ dữ liệu.
- Pagination hoặc load-more tĩnh nếu cần.

Yêu cầu route:

- Vẫn là `/slug`.
- Không public `/product-category/slug`.

Render/test:

- Render lại 1 route product_cat mẫu.
- Render thêm 1 route category cấp cao nếu có.

Commit đề xuất:

```text
commit 004: feat(archive): add hard-coded product category layout
```

## Phase 5: Product Detail Layout

Mục tiêu:

- Product detail bán hàng được về mặt UI.
- Sản phẩm có biến thể hiển thị đúng trong trang cha.

Thành phần:

- Breadcrumb.
- Gallery.
- Product title.
- Price.
- Sale price.
- Stock/SKU nếu có.
- Short description.
- Variation selector.
- Quantity.
- Add to cart button.
- Product content/description.
- Tabs/sections:
  - Mô tả.
  - Thông số.
  - Chính sách.
  - Related products.

Biến thể WooCommerce:

- Không tạo route tĩnh riêng cho variation.
- Variation nằm trong JSON/data của product cha.
- User chọn thuộc tính trước khi add to cart.
- JS xác định variation matching.

Render/test:

- Render lại 1 product route có variation.
- Render lại 1 product route simple product.

Commit đề xuất:

```text
commit 005: feat(product): add hard-coded product detail with variations
```

## Phase 6: Post, Page, Blog Layout

Mục tiêu:

- Các page/post WordPress hiển thị sạch.
- SEO content vẫn dùng Rank Math/meta nếu có.

Page layout:

- Breadcrumb.
- Title.
- Featured image nếu có.
- Content HTML sanitized/rendered.

Post layout:

- Breadcrumb.
- Title.
- Date/author nếu có.
- Featured image.
- Content.
- Related posts nếu có.

Archive blog/category/tag:

- Title.
- Description.
- Post list.

Render/test:

- Render lại 1 page.
- Render lại 1 post.
- Render lại 1 category/tag route nếu có.

Commit đề xuất:

```text
commit 006: feat(content): add hard-coded page and post layouts
```

## Phase 7: Client Cart Runtime

Mục tiêu:

- Add to cart hoạt động phía client.
- Cart page là static shell nhưng dữ liệu cart động trong browser.

Cart storage:

- Ban đầu dùng `localStorage`.
- Mỗi item lưu:
  - product id.
  - product slug/path.
  - variation id nếu có.
  - selected attributes.
  - quantity.
  - snapshot title/image/price.

Cart page:

- Route tĩnh: `/cart` hoặc slug tiếng Việt nếu chốt.
- Hiển thị items.
- Update quantity.
- Remove item.
- Subtotal.
- Link checkout.

Lưu ý:

- Giá trong cart chỉ là preview.
- Checkout backend phải validate lại price/stock.

Render/test:

- Render lại product mẫu.
- Render lại cart shell.

Commit đề xuất:

```text
commit 007: feat(cart): add client-side cart shell and runtime
```

## Phase 8: Checkout Shell + Commerce API Proxy

Mục tiêu:

- Đặt hàng thật được.
- Không lộ Woo key/secret trong browser.

Backend nhỏ:

- Node server/API proxy hoặc serverless function.
- Env giữ Woo key/secret.
- Browser gọi backend.
- Backend gọi WooCommerce tạo order.

Checkout page:

- Customer info.
- Billing/shipping.
- Order summary.
- Payment method ban đầu:
  - COD.
  - Bank transfer.
- Submit order.

Server validation:

- Re-read product/variation from Woo.
- Validate stock.
- Validate price.
- Create Woo order.

Render/test:

- Render checkout shell.
- Test tạo order với sandbox/test product.

Commit đề xuất:

```text
commit 008: feat(checkout): add checkout shell and commerce API order proxy
```

## Phase 9: User/Auth/Account

Mục tiêu:

- Có login/account tương tự Woo ở mức MVP.

Trang shell:

- `/login`
- `/account`
- `/orders`
- `/order-detail` hoặc route theo query/token.

Backend:

- Auth bằng WP Application Password/JWT/plugin tùy nguồn thật.
- Không lưu secret trong browser.
- Session/cookie hoặc token ngắn hạn.

Account:

- Thông tin user.
- Order history.
- Order detail.
- Logout.

Commit đề xuất:

```text
commit 009: feat(account): add customer auth and account shells
```

## Phase 10: SEO, Schema, Breadcrumb Hoàn Thiện

Mục tiêu:

- Public static pages tốt cho SEO.

Việc cần làm:

- Product schema.
- Breadcrumb schema.
- Organization schema.
- Open Graph.
- Canonical.
- Rank Math meta mapping.
- Sitemap.
- Robots.

Render/test:

- Render lại các route mẫu.
- Kiểm tra HTML head.

Commit đề xuất:

```text
commit 010: feat(seo): complete storefront SEO and schema output
```

## Phase 11: Incremental Build Theo Route

Trạng thái: `IN PROGRESS`

Mục tiêu:

- Khi code/test UI từng trang, chỉ render lại route cần xem.

Việc cần làm:

- Tạo helper hoặc CLI flag:

```bash
npm run build:route -- --project examples/basic-shop --route /
npm run build:route -- --project examples/basic-shop --route /hop-nap-cai-tsp01
npm run build:route -- --project examples/basic-shop --route / --mock
```

Script hiện có:

```text
scripts/build-route.js
```

Yêu cầu:

- Route data và HTML route được update.
- Public assets chỉ copy khi cần.
- Full build vẫn tồn tại cho release.

Ghi chú triển khai:

- `npm run build:route` đã được thêm vào root `package.json`.
- Tham số `--project` chọn project cần build.
- Tham số `--route` chọn đúng route public, ví dụ `/` hoặc `/iphone-15`.
- Tham số `--mock` dùng dữ liệu mẫu để test nhanh, không gọi API thật.
- Không xoá `dist`, chỉ ghi lại HTML/data của route được chọn thông qua incremental build.

Commit đề xuất:

```text
commit 011: feat(build): add route-level static rebuild workflow
```

## Phase 12: Real Data QA Pass

Mục tiêu:

- Chạy toàn site với `api.tinsinhphat.com`.
- Fix các sai khác data thật.

Checklist:

- WP posts/pages.
- Woo products.
- Product variations.
- Product categories cấp cao/cấp con.
- Images.
- Rank Math SEO.
- Breadcrumb.
- Menu.
- Cart add simple product.
- Cart add variation product.
- Checkout test order.

Commit đề xuất:

```text
commit 012: chore(qa): verify real WordPress WooCommerce storefront data
```

## Phase 13: Production Deploy Local/VPS

Mục tiêu:

- Site chạy production ổn trên nginx/static hosting.

Việc cần làm:

- Build production.
- Nginx static flat route.
- Cache headers.
- No trailing slash.
- 404 fallback đúng.
- API proxy deploy.
- Env production cho Woo/WP.

Commit đề xuất:

```text
commit 013: chore(deploy): prepare static storefront production deployment
```

## Phase 14: Quay Lại UI Builder

Mục tiêu:

- Sau khi web chạy được, builder quay lại để nâng cấp dần.

Builder không còn là blocker.

Việc có thể làm:

- Save/publish template thật.
- Global header/footer builder.
- Better drag/drop.
- Color picker.
- Spacing controls.
- Responsive controls.
- Presets.
- Custom component.
- Undo/redo.

Commit đề xuất:

```text
commit 014: feat(builder): resume visual template builder after storefront MVP
```

## Thứ Tự Ưu Tiên Rút Gọn

Nếu cần ra web nhanh nhất:

```text
1. Phase 2: Page shell chung
2. Phase 3: Homepage
3. Phase 4: Product category
4. Phase 5: Product detail + variations
5. Phase 7: Cart client
6. Phase 8: Checkout API
7. Phase 10: SEO/schema
8. Phase 12: Real data QA
```

Các phase account/auth/order có thể làm sau nếu giai đoạn đầu chỉ cần khách đặt hàng không đăng nhập.

## Định Nghĩa MVP Hoạt Động

MVP được xem là hoạt động khi:

- Homepage xem được.
- Product category xem được.
- Product detail xem được.
- Variation chọn được.
- Add to cart được.
- Cart xem/sửa/xóa được.
- Checkout tạo Woo order được.
- SEO title/meta/schema có dữ liệu.
- Route public là `domain/slug`.
- Không lộ Woo key/secret ra browser.
- Có thể deploy static + API proxy.

## Ghi Chú Cho Codex

- Không tiếp tục mở rộng builder nếu user không yêu cầu trực tiếp.
- Khi code layout, ưu tiên component hard-code trong theme.
- Khi user yêu cầu code trang cụ thể, chỉ render lại file tĩnh của trang đó và asset liên quan.
- Full build chỉ chạy khi cần QA toàn site hoặc đổi tầng dữ liệu/router.
- Luôn giữ URL flat.
- Không tạo public folder route kiểu `/product/...`.
