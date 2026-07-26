# WPSC Pre-component Audit And Data Contract

Ngày ghi nhận: 2026-07-18

## Mục tiêu

Trước khi tách component, cần chốt 2 việc:

1. Rà lại các page chính để biết nền hiện tại đang chạy ổn.
2. Khóa contract dữ liệu cho theme để khi tách component không bị phụ thuộc lộn xộn vào `content`, `graph`, `route`.

Tài liệu này là mốc chuyển từ giai đoạn hard-code layout sang giai đoạn tách component/theme.

## Smoke Test Hiện Tại

Runtime kiểm tra:

```text
http://localhost:8787
```

Các route đã rà:

```text
200 /                         Homepage
200 /in-brochure              Product category archive
200 /to-roi-a4-giay-couche-150gsm Product detail
200 /cart                     Cart shell
200 /checkout                 Checkout shell
200 /thank-you                Thank-you shell
200 /account                  Account shell
200 /search                   Search page
404 /duong-dan-khong-co       Not found page
```

Kiểm tra HTML thô:

```text
Không thấy [object Object]
Không thấy TypeError
Không thấy ReferenceError
Không thấy Cannot read
```

Kết luận:

```text
Nền đủ ổn để chuyển sang tách component.
Chưa cần thêm feature lớn trước khi tách.
```

## Nguyên Tắc Khi Tách Component

Theme component không gọi trực tiếp WordPress API, WooCommerce API, runtime API, hoặc đọc `.env`.

Component chỉ nhận dữ liệu đã chuẩn hóa từ layout/theme context.

Nguồn dữ liệu thật vẫn đi theo pipeline:

```text
WordPress/WooCommerce/API -> adapter -> route content/graph/data json -> layout -> component -> HTML tĩnh
```

Runtime dynamic chỉ dùng cho:

```text
cart
checkout
account
auth
orders
coupon
shipping
payment
recently viewed
search interactive behavior nếu cần
```

## Contract Chung Cho Layout

Mỗi layout hiện nhận context dạng:

```js
{
  content,
  graph,
  html,
  route,
  components,
  site,
  theme
}
```

Khi tách component, nên chuẩn hóa thành:

```js
{
  content,
  route,
  nav,
  data,
  ui,
  helpers,
  html
}
```

Trong đó:

```text
content: dữ liệu chính của route hiện tại.
route: path, slug, type, pagination, SEO route metadata.
nav: menu/header/footer/category navigation đã chuẩn hóa.
data: dữ liệu phụ theo từng page, ví dụ products, categories, relatedProducts.
ui: theme settings, labels, brand, colors, assets.
helpers: escape, format price, format date, build href, render raw html an toàn.
html: template helper hiện có.
```

## Contract: Site Shell

Component nhóm shell:

```text
SiteShell
TopHeader
MainHeader
SiteFooter
ThemeToggle
SearchForm
CartLink
AccountLink
```

Dữ liệu cần có:

```js
{
  site: {
    title,
    url,
    logoText,
    logoImage,
    phone,
    email,
    address
  },
  nav: {
    primaryItems: [{ label, href, active }],
    categoryItems: [{ label, href, active, count, image }],
    footerColumns: [{ title, links: [{ label, href }] }]
  },
  runtime: {
    accountHref,
    cartHref,
    searchHref
  }
}
```

Yêu cầu UI đã chốt:

```text
Body font-family theo hệ thống OS.
Font size nền 13pt.
Content width 1340px, canh giữa.
Header/footer dùng chung trên các page thương mại.
Dark/light toggle nằm ở top/header và hoạt động sau khi chuyển trang.
```

## Contract: Banner Và Page Heading

Component:

```text
HomeBanner
PageHeading
ArchiveHeading
ProductHeading
CommerceHeading
```

Dữ liệu cần có:

```js
{
  title,
  eyebrow,
  descriptionHtml,
  backgroundImage,
  breadcrumbs: [{ label, href }],
  actions: [{ label, href, variant }]
}
```

Yêu cầu UI đã chốt:

```text
Heading các trang dùng font-size 2rem.
H1 logo header không được ăn CSS heading chung.
Product/category heading có thể dùng ảnh đại diện làm nền.
Cart/checkout/thank-you/account dùng heading cùng tinh thần category/product.
```

## Contract: Category Card

Component:

```text
CategoryCard
CategoryGrid
ChildCategoryList
```

Dữ liệu cần có:

```js
{
  id,
  slug,
  label,
  href,
  count,
  image,
  descriptionHtml,
  parentId,
  children: []
}
```

Yêu cầu UI đã chốt:

```text
Category archive cha hiển thị category con trước danh sách sản phẩm.
Category cha hiển thị sản phẩm thuộc tất cả category con liên quan.
Breadcrumb category phải đủ: Trang chủ -> cha -> con.
Card category hover nổi nhẹ.
Ảnh đại diện dùng từ API nếu có.
Description giữ HTML từ WordPress, nhưng hiển thị gọn và dễ đọc.
```

## Contract: Product Card

Component:

```text
ProductCard
ProductGrid
RelatedProducts
RecentlyViewedProducts
```

Dữ liệu cần có:

```js
{
  id,
  slug,
  href,
  title,
  image,
  price,
  regularPrice,
  salePrice,
  priceRange,
  currency,
  categories: [{ id, label, href, parentId }],
  attributes: [{ name, slug, options }],
  variations: [],
  stockStatus,
  type
}
```

Yêu cầu UI đã chốt:

```text
Homepage product card không hiển thị mô tả.
Search product card không hiển thị mô tả.
Category product grid desktop 4 cột, tối đa 12 sản phẩm/trang.
Homepage category rows dùng 5 sản phẩm đầu.
Related/recently viewed product detail dùng 1 dòng 5 sản phẩm.
Nếu product variable thì card hiển thị giá thấp - cao.
Card hover nổi nhẹ, ảnh full width card, chỉ bo 2 góc trên.
Tên, giá, category không quá đậm.
```

## Contract: Product Detail

Component:

```text
ProductDetail
ProductGallery
ProductSummary
ProductVariationPicker
ProductQuoteTable
ProductTabs
ProductServiceStrip
ProductBreadcrumbs
```

Dữ liệu cần có:

```js
{
  product: ProductCardData & {
    gallery: [{ src, alt }],
    shortDescriptionHtml,
    descriptionHtml,
    sku,
    categories,
    breadcrumbs,
    relatedProducts,
    recentlyViewedProducts,
    quoteRows,
    variationMatrix
  }
}
```

Yêu cầu UI đã chốt:

```text
Product detail có banner giống trang chủ.
Product title dùng ảnh đại diện làm nền.
Breadcrumb nằm trên title và đủ cha - con.
Grid product detail 35% gallery, 65% summary.
Short description giữ HTML từ WordPress.
Bảng báo giá đặt trên phần chọn variation.
Variation picker giữ để khách chọn trước khi thêm giỏ hàng.
Khi chọn thuộc tính số lượng thì input number đổi theo số lượng đó.
Clear variation trả input number về 1.
Nút thêm giỏ hàng và nhận báo giá có cursor pointer.
Mô tả sản phẩm nằm trong tab.
```

## Contract: Cart

Component:

```text
CartPage
CartItemList
CartItem
CartSummary
CouponBox
CheckoutProgress
```

Dữ liệu runtime cần có:

```js
{
  cartItems: [{
    productId,
    variationId,
    href,
    title,
    image,
    price,
    quantity,
    attributes
  }],
  coupon,
  subtotal,
  discountTotal,
  shippingTotal,
  total
}
```

Yêu cầu UI đã chốt:

```text
Cart có header/footer.
Heading giống category/product, dùng ảnh nền cart.
Có tiến trình đặt hàng: Giỏ hàng -> Thanh toán -> Hoàn tất.
Số lượng là input number.
Coupon khi apply thì hiện mã, nút clear, và ẩn ô nhập.
Nút đặt hàng màu trắng chữ, có khoảng cách với tiếp tục mua hàng.
```

## Contract: Checkout

Component:

```text
CheckoutPage
CheckoutForm
CheckoutOrderReview
PaymentMethods
ShippingMethods
TermsCheckbox
PrivacyNotice
```

Dữ liệu runtime cần có:

```js
{
  customer,
  cartItems,
  coupon,
  shippingMethods,
  paymentMethods,
  totals,
  orderPayload
}
```

Yêu cầu UI đã chốt:

```text
Payment đặt trong khối đơn hàng của bạn.
Có shipment trước tạm tính.
Shipment không free thì tính lại tổng.
Có coupon trong đơn hàng nếu cart chưa nhập.
Có checkbox điều khoản và điều kiện.
Privacy link dùng /chinh-sach-bao-mat.
Submit tạo order thật về WooCommerce qua runtime server.
```

## Contract: Account/User

Component:

```text
AccountShell
LoginForm
RegisterForm
VerifyEmailPanel
LostPasswordForm
ResetPasswordForm
AccountOrders
AccountOrderDetail
AccountAddressForm
ChangePasswordForm
```

Dữ liệu runtime cần có:

```js
{
  session,
  user,
  orders,
  selectedOrder,
  addresses,
  authStatus
}
```

Yêu cầu UI đã chốt:

```text
Đăng nhập dùng user WordPress thật qua WPSC auth bridge.
wp-static giữ session, dùng userId lấy đúng dữ liệu user đó.
Header sau login đổi trạng thái sang dashboard/tên user.
Bỏ tab tổng quan.
Tab đơn hàng chia 2 cột: danh sách bên trái, chi tiết bên phải.
Danh sách đơn hàng phân trang nếu hơn 10 đơn.
Click sản phẩm trong đơn hàng dẫn về product detail.
Register, verify email, forgot password, reset password đã có nền plugin/API.
Zoho mail bridge dùng cho transactional email.
```

## Contract: Search

Component:

```text
SearchPage
SearchForm
SearchResults
SearchResultCard
LoadMoreTrigger
```

Dữ liệu cần có:

```js
{
  query,
  results: [ProductCardData],
  pagination,
  suggestions
}
```

Yêu cầu UI đã chốt:

```text
Search từ header và form nội dung đều phải hoạt động.
Card click chuyển đúng product detail.
Product card search không có mô tả.
Có thể dùng lazy/load more theo scroll, nhưng không sa đà quá trước khi tách component.
```

## Contract: 404

Component:

```text
NotFoundPage
```

Dữ liệu cần có:

```js
{
  title,
  description,
  searchHref,
  homeHref,
  shopHref,
  suggestedCategories
}
```

Yêu cầu UI đã chốt:

```text
URL không tồn tại trả HTTP 404.
Nội dung dùng header/footer hiện tại.
Có search và link điều hướng về trang chủ/sản phẩm.
```

## Component Tách Trước

Thứ tự đề xuất:

```text
1. shared/formatters.js
2. components/siteShell.js
3. components/header.js
4. components/footer.js
5. components/banner.js
6. components/breadcrumbs.js
7. components/productCard.js
8. components/categoryCard.js
9. components/productGrid.js
10. components/pageHeading.js
```

Lý do:

```text
Các component này đang được dùng lặp lại nhiều nhất.
Tách trước sẽ giảm tải storefrontShell.js nhanh nhất.
Chưa đụng sâu logic account/checkout để tránh làm vỡ runtime dynamic.
```

## Quy Tắc Build Khi Tách

Khi tách component shared:

```text
Build CSS nếu đổi CSS.
Build lại route mẫu đại diện:
/ 
/in-brochure
/to-roi-a4-giay-couche-150gsm
/cart
/checkout
/account
/search
/404
```

Khi chỉ sửa một layout riêng:

```text
Chỉ build route thuộc layout đó.
```

Full build chỉ dùng khi:

```text
Đổi data model.
Đổi adapter.
Đổi router.
Đổi logic tạo nhiều route/pagination.
Chuẩn bị release/push cuối buổi.
```

## Kết Luận

Có thể chuyển sang tách component.

Không nên code thêm feature lớn trước khi tách, vì các page chính đã đủ nền để component hóa.

Ưu tiên hiện tại:

```text
Tách shared shell/card/heading trước.
Giữ nguyên giao diện đang có.
Sau mỗi nhịp tách, build route mẫu và smoke test.
```

## Phần 3: Component Extraction Roadmap

Mục tiêu của phần này:

```text
Tách component mà không đổi giao diện đang chốt.
Mỗi commit nhỏ, dễ review, dễ rollback.
Không đụng logic commerce runtime nếu không cần.
```

### Hiện trạng code cần tách

File đang tập trung nhiều UI nhất:

```text
examples/basic-shop/theme/components/storefrontShell.js
```

Đang chứa:

```text
renderPageShell
renderBanner
renderProductCard
renderTopHeader
renderMainHeader
renderWhyChooseUs
renderFooter
renderBreadcrumbs
escape/format helpers
```

Các layout còn nhiều block nội bộ:

```text
examples/basic-shop/theme/layouts/page.js
examples/basic-shop/theme/layouts/archive.js
examples/basic-shop/theme/layouts/product.js
examples/basic-shop/theme/layouts/search.js
examples/basic-shop/theme/layouts/account.js
```

Nhận định:

```text
Không nên tách product detail trước, vì đang chứa variation picker, quote table, schema, recently viewed.
Nên tách shared shell/card/heading trước để giảm rủi ro.
```

### Commit 001: Tách helper nền `[x]`

Mục tiêu:

```text
Tách escape/format/normalize helpers ra khỏi storefrontShell.js.
```

File dự kiến:

```text
examples/basic-shop/theme/components/shared/html.js
examples/basic-shop/theme/components/shared/format.js
examples/basic-shop/theme/components/shared/image.js
```

Di chuyển:

```text
escapeText
escapeAttribute
formatPrice
formatProductPrice
getProductSortPrice
normalizeImageUrl
```

Không đổi HTML output.

Route kiểm tra:

```text
/
/in-brochure
/to-roi-a4-giay-couche-150gsm
/search
/404
```

### Commit 002: Tách Site Shell `[x]`

Mục tiêu:

```text
Tách khung trang chung ra khỏi storefrontShell.js.
```

File dự kiến:

```text
examples/basic-shop/theme/components/siteShell.js
examples/basic-shop/theme/components/header/topHeader.js
examples/basic-shop/theme/components/header/mainHeader.js
examples/basic-shop/theme/components/footer/footer.js
```

Di chuyển:

```text
renderPageShell
renderTopHeader
renderMainHeader
renderFooter
renderFooterContact
```

Giữ export tương thích từ `storefrontShell.js` để layout cũ chưa cần sửa hàng loạt.

Route kiểm tra:

```text
/
/cart
/checkout
/account
/404
```

### Commit 003: Tách Navigation Và Breadcrumb `[x]`

Mục tiêu:

```text
Chuẩn hóa nav/category nav/breadcrumb dùng chung.
```

File dự kiến:

```text
examples/basic-shop/theme/components/navigation/navItems.js
examples/basic-shop/theme/components/navigation/breadcrumbs.js
```

Di chuyển:

```text
createNavItemsFromCategories
renderBreadcrumbs
normalizeNavItems
```

Sau commit này, archive/product/page có thể dùng chung breadcrumbs thay vì tự viết nhiều lần.

Route kiểm tra:

```text
/in-brochure
/to-roi-a4-giay-couche-150gsm
/search
```

### Commit 004: Tách Banner Và Page Heading `[x]`

Mục tiêu:

```text
Tách các heading/hero chung để page/category/product/cart/account dùng cùng chuẩn.
```

File dự kiến:

```text
examples/basic-shop/theme/components/banner.js
examples/basic-shop/theme/components/pageHeading.js
```

Di chuyển/tạo:

```text
renderBanner
renderPageHeading
renderCommerceHeading
```

Yêu cầu không đổi:

```text
Heading các trang giữ font-size 2rem.
Logo h1 không bị ăn CSS heading chung.
Cart heading giữ ảnh nền cart.
Category/product heading giữ ảnh đại diện làm nền nếu có.
```

Route kiểm tra:

```text
/
/in-brochure
/to-roi-a4-giay-couche-150gsm
/cart
/account
/404
```

### Commit 005: Tách Product Card Và Product Grid `[x]`

Mục tiêu:

```text
Product card dùng chung cho homepage, category, search, related, recently viewed.
```

File dự kiến:

```text
examples/basic-shop/theme/components/product/productCard.js
examples/basic-shop/theme/components/product/productGrid.js
```

Di chuyển:

```text
renderProductCard
findProductCategory
```

Tạo thêm wrapper:

```text
renderProductGrid(products, options)
```

Yêu cầu không đổi:

```text
Card không hiển thị mô tả.
Card hover nổi nhẹ.
Ảnh full width, bo 2 góc trên.
Variable product hiển thị giá thấp nhất/price range theo logic hiện có.
```

Route kiểm tra:

```text
/
/in-brochure
/to-roi-a4-giay-couche-150gsm
/search
```

### Commit 006: Tách Category Card Và Category Grid `[x]`

Mục tiêu:

```text
Category card dùng chung cho homepage và archive category con.
```

File dự kiến:

```text
examples/basic-shop/theme/components/category/categoryCard.js
examples/basic-shop/theme/components/category/categoryGrid.js
```

Tạo:

```text
renderCategoryCard(category, options)
renderCategoryGrid(categories, options)
```

Yêu cầu không đổi:

```text
Ảnh category lấy từ API nếu có.
Hiển thị tên category và số sản phẩm.
Hover giống product card.
```

Route kiểm tra:

```text
/
/in-brochure
```

### Commit 007: Tách Service Strip Và Why Choose Us `[x]`

Mục tiêu:

```text
Tách các section lặp/marketing khỏi page/product.
```

File dự kiến:

```text
examples/basic-shop/theme/components/sections/serviceStrip.js
examples/basic-shop/theme/components/sections/whyChooseUs.js
```

Di chuyển:

```text
renderWhyChooseUs
renderServiceStrip
```

Yêu cầu không đổi:

```text
Why choose us chỉ giữ ở homepage.
Product detail có storefront-service-strip trên mô tả.
```

Route kiểm tra:

```text
/
/to-roi-a4-giay-couche-150gsm
/in-brochure
```

### Commit 008: Tách Archive Components `[x]`

Mục tiêu:

```text
Archive layout gọn lại, phần UI tách thành component.
```

File dự kiến:

```text
examples/basic-shop/theme/components/archive/archiveHeader.js
examples/basic-shop/theme/components/archive/archiveToolbar.js
examples/basic-shop/theme/components/archive/archiveDescription.js
examples/basic-shop/theme/components/archive/archivePagination.js
```

Di chuyển:

```text
renderArchiveDescription
renderPagination
createPaginationSummary có thể giữ helper hoặc chuyển format.
```

Không tách logic cây category quá mạnh ở commit này, chỉ tách render UI trước.

Route kiểm tra:

```text
/in-brochure
/in-brochure/page/2 nếu có file
```

### Commit 009: Tách Product Detail Components `[x]`

Mục tiêu:

```text
Product detail bớt dài nhưng giữ nguyên behavior variation/cart/schema.
```

File dự kiến:

```text
examples/basic-shop/theme/components/product/productGallery.js
examples/basic-shop/theme/components/product/productSummary.js
examples/basic-shop/theme/components/product/productTabs.js
examples/basic-shop/theme/components/product/variationPicker.js
examples/basic-shop/theme/components/product/quoteTable.js
```

Di chuyển:

```text
renderVariantOptions
renderQuoteTable
renderProductSpecPanel
renderProductShippingPanel
renderProductSupportPanel
```

Điểm cần giữ rất kỹ:

```text
data-product-variants JSON.
data-add-to-cart attributes.
data-request-quote attributes.
Clear variation reset quantity = 1.
Click thuộc tính số lượng đổi input number.
```

Route kiểm tra:

```text
/to-roi-a4-giay-couche-150gsm
một sản phẩm variable khác nếu cần
```

### Commit 010: Tách Commerce Shell Components `[x]`

Mục tiêu:

```text
Tách UI tĩnh của cart/checkout/thank-you/account shell.
```

File dự kiến:

```text
examples/basic-shop/theme/components/commerce/cartHeading.js
examples/basic-shop/theme/components/commerce/checkoutProgress.js
examples/basic-shop/theme/components/account/accountShellPlaceholder.js
```

Không chuyển runtime JS trong commit này.

Route kiểm tra:

```text
/cart
/checkout
/thank-you
/account
```

### Commit 011: Chuẩn hóa barrel exports `[x]`

Mục tiêu:

```text
Tạo entry rõ ràng cho theme components.
```

File dự kiến:

```text
examples/basic-shop/theme/components/index.js
examples/basic-shop/theme/components/storefrontShell.js
```

Hướng:

```text
index.js export nhóm component mới.
storefrontShell.js chỉ còn compatibility layer trong giai đoạn chuyển tiếp.
Layout có thể import trực tiếp từ index.js hoặc component cụ thể.
```

Route kiểm tra:

```text
/
/in-brochure
/to-roi-a4-giay-couche-150gsm
/cart
/checkout
/account
/search
/404
```

### Commit 012: Cập nhật tài liệu theme reusable `[x]`

Mục tiêu:

```text
Ghi lại cấu trúc component mới và hướng tách theme độc lập về sau.
```

File cập nhật:

```text
docs/theme-system.md
outputs/WPSC_Theme_System_User_Theme_Requirements.md
outputs/WPSC_Pre_Component_Audit_And_Data_Contract.md
```

Nội dung:

```text
Component folder structure.
Public API của theme components.
Quy tắc không gọi API/env trong theme.
Quy tắc build route mẫu sau khi sửa theme.
```

## Checklist Khi Code Mỗi Commit

Mỗi commit component hóa cần làm:

```text
1. Tách file/component.
2. Giữ export cũ nếu layout khác còn dùng.
3. Chạy node --check các file JS vừa sửa.
4. Build CSS nếu có đổi CSS.
5. Build route mẫu liên quan, không full build nếu không cần.
6. Smoke test URL trên runtime.
7. Ghi ngắn vào final: đã tách gì, route nào đã kiểm tra.
```

## Tiêu Chí Hoàn Thành Phần Tách Component

Đạt khi:

```text
storefrontShell.js không còn là file chứa mọi thứ.
Header/footer/banner/card/heading có file riêng.
Product/archive layout đọc được theo block rõ ràng.
Giao diện public không đổi so với bản đã chốt.
Runtime cart/checkout/account không bị vỡ.
```
