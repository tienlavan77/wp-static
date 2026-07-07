# WPSC Static Builder Architecture Notes

Ngày ghi chú: 2026-07-07

## Mục tiêu chính

WPSC hướng tới một framework tạo website tĩnh cho WordPress/WooCommerce.

Builder chỉ là công cụ admin để tạo cấu hình layout, component và theme settings. Website public cuối cùng phải được build ra HTML/CSS/JS/JSON tĩnh và được Nginx/CDN phục vụ trực tiếp.

Luồng tổng quát:

```text
WP/Woo/API data
        +
Builder layout JSON
        +
Theme components
        ↓
Static build
        ↓
HTML / CSS / JS / JSON tĩnh
```

Khi visitor truy cập:

```text
Browser -> Nginx -> static files
```

Khi admin chỉnh sửa:

```text
Admin chỉnh WP/Woo hoặc Builder
        ↓
Trigger rebuild route liên quan
        ↓
Cập nhật file tĩnh
```

## Builder giống Flatsome, nhưng dành cho static site

Builder có thể lấy cảm hứng từ Flatsome UX Builder:

- Section / container / row / column.
- Component/element kéo thả.
- Header/Footer có thể chỉnh bố cục.
- Component có settings riêng.
- Người dùng không cần code vẫn dựng được trang.

Điểm khác quan trọng:

- Frontend public là static output, không phụ thuộc WordPress runtime.
- Layout lưu bằng JSON rõ ràng, dễ version, dễ diff, dễ rebuild.
- Component render bằng JS theme component, không dùng shortcode phức tạp.
- Sửa page/component nào thì build lại route liên quan.
- WP/Woo chỉ là nguồn dữ liệu, không phải engine render frontend.

## Component lớn và component nhỏ

Component lớn là layout/container component. Component nhỏ là block/item component.

Ví dụ Header:

```text
Header
  HeaderLogo
  HeaderSearch
  HeaderTopNav
  HeaderMainNav
  HeaderActions
  HeaderCart
  HeaderAccount
  HeaderMobileMenu
```

Nguyên tắc:

- Component lớn chịu trách nhiệm bố cục.
- Component nhỏ chịu trách nhiệm hiển thị một chức năng cụ thể.
- Builder phải cho người dùng kéo component nhỏ vào slot/column của component lớn.

## Layout động bên trong component lớn

Người dùng nên tự tạo bố cục bên trong component lớn.

Ví dụ Header có 3 dòng:

- Dòng 1 có 2 cột.
- Dòng 2 có 3 cột.
- Dòng 3 có 2 cột.

Ví dụ JSON:

```json
{
  "component": "Header",
  "layout": {
    "rows": [
      {
        "id": "row-1",
        "columns": [
          { "id": "left", "width": "1fr" },
          { "id": "right", "width": "1fr" }
        ]
      },
      {
        "id": "row-2",
        "columns": [
          { "id": "left", "width": "240px" },
          { "id": "center", "width": "1fr" },
          { "id": "right", "width": "220px" }
        ]
      },
      {
        "id": "row-3",
        "columns": [
          { "id": "nav", "width": "1fr" },
          { "id": "actions", "width": "auto" }
        ]
      }
    ]
  },
  "slots": {
    "row-1.left": ["HeaderNotice"],
    "row-1.right": ["HeaderTopNav"],
    "row-2.left": ["HeaderLogo"],
    "row-2.center": ["HeaderSearch"],
    "row-2.right": ["HeaderCart", "HeaderAccount"],
    "row-3.nav": ["HeaderMainNav"],
    "row-3.actions": ["DarkModeToggle"]
  }
}
```

Builder cần hỗ trợ tối thiểu:

- Thêm/xóa dòng.
- Chọn số cột trong từng dòng.
- Chỉnh width cột: `auto`, `1fr`, `px`, `%`.
- Chỉnh gap, align, justify.
- Kéo component con vào từng slot.
- Ẩn/hiện row hoặc column theo desktop/mobile.

## Component schema và layout JSON

Không phải mỗi component bắt buộc có một file JSON riêng.

Nên tách 3 nhóm:

```text
theme/components/              # JS render component gốc
theme/component-registry.json  # schema/metadata component gốc
data/layouts/                  # layout page/template
data/components/               # composite component do người dùng tạo
```

Component code:

```text
theme/components/header/Header.js
theme/components/header/HeaderLogo.js
theme/components/product/ProductCard.js
```

Component registry/schema mô tả:

- Component tên gì.
- Props nào chỉnh được.
- Slot nào tồn tại.
- Slot nhận component con loại nào.
- Default props/layout.

Page layout JSON lưu bố cục thật của từng page/template.

## Người dùng tạo component riêng

Có 2 cấp custom component.

### 1. User-created composite component

Người dùng ghép layout + component con trong builder rồi lưu lại thành component mới.

Ví dụ:

```text
PromoHeader
  Row 1: Logo | Search | Cart
  Row 2: MainNav | Hotline
```

Lưu thành JSON:

```json
{
  "id": "component:promo-header",
  "name": "Promo Header",
  "kind": "composite",
  "version": 1,
  "tree": [
    {
      "component": "Header",
      "layout": {
        "rows": []
      },
      "slots": {}
    }
  ]
}
```

Nên lưu tại:

```text
data/components/
```

Hoặc nếu multi-site:

```text
data/sites/{siteId}/components/
```

### 2. Developer-created component

Developer viết JS component trong theme:

```text
theme/components/custom/PromoBox.js
```

Sau đó khai báo trong registry/schema.

Loại này mạnh hơn, nhưng cần code và test.

## Gán layout vào page

Người dùng tạo layout trong builder, layout đó có `layoutId`.

Page cụ thể sẽ trỏ tới layout bằng `layoutId`.

Ví dụ page:

```json
{
  "id": "page:landing-in-an",
  "type": "page",
  "slug": "in-an-gia-re",
  "path": "/in-an-gia-re",
  "title": "In ấn giá rẻ",
  "layoutId": "layout:landing-in-an"
}
```

Ví dụ layout:

```json
{
  "id": "layout:landing-in-an",
  "name": "Landing In Ấn",
  "type": "landing",
  "tree": [
    { "component": "Header", "props": { "variant": "simple" } },
    { "component": "HeroLanding", "props": { "title": "In nhanh trong ngày" } },
    { "component": "BenefitGrid" },
    { "component": "ProductOffer" },
    { "component": "FAQ" },
    { "component": "CTA" },
    { "component": "Footer" }
  ]
}
```

Ưu tiên resolve layout khi build:

```text
1. route.layoutId
2. binding theo exact path / slug
3. binding theo content type
4. fallback layout mặc định của theme
```

## Gán layout ở đâu trong builder

Nên có 2 luồng:

### Page Builder

Khi sửa một page cụ thể:

```text
Page settings
  Title
  Slug
  SEO
  Use layout: [Landing In Ấn]
  Save as reusable layout
```

### Layout Manager

Dùng để gán layout hàng loạt:

```text
Apply to:
  [ ] This exact page: /in-an-gia-re
  [ ] All products
  [ ] All posts
  [ ] Product category: In ấn
  [ ] Custom rule
```

## Landing page

Với layout JSON + component registry, framework có thể tạo landing page riêng cho:

- Dịch vụ.
- Sản phẩm.
- Danh mục.
- Chiến dịch quảng cáo.
- Landing page theo mùa.
- A/B testing.

Landing page vẫn là HTML tĩnh, nhanh và dễ SEO.

## Builder admin và bảo mật

Builder phải nằm sau đăng nhập admin.

Public visitor chỉ xem static output:

```text
/
/san-pham-a
/danh-muc-a
/storefront.css
```

Admin/editor vào builder:

```text
/admin
/admin/login
/admin/builder
/admin/layouts
/admin/pages
/admin/builds
```

Kiến trúc đề xuất:

```text
Same project
  src/static-renderer     -> build HTML tĩnh public
  src/admin               -> login + builder UI + admin API
  theme/components        -> component dùng để render
  data/layouts            -> layout JSON
  outputs/dist            -> file public tĩnh
```

Deploy VPS:

```text
Nginx
  /              -> serve static dist
  /admin/*       -> proxy tới Node admin server, có login
```

Phân quyền tối thiểu:

```text
admin
  - toàn quyền builder, layout, sync, build, config

editor
  - sửa page/layout/content
  - không sửa config hệ thống/API key

viewer
  - chỉ xem preview/build status
```

## Chỉnh CSS trong builder

Không nên cho custom CSS tự do ngay từ đầu.

Nên chia 3 cấp:

### Cấp 1: Style controls an toàn

Cho người dùng chỉnh qua UI:

- Spacing: margin, padding, gap.
- Typography: font size, weight, line height, align.
- Color: text, background, border.
- Layout: width, max-width, columns, align, justify.
- Border: radius, border, shadow.

Builder lưu style thành JSON.

### Cấp 2: Custom class

Cho người dùng nâng cao nhập class riêng.

CSS của class nằm trong theme/admin quản lý.

### Cấp 3: Custom CSS toàn theme

Chỉ dành cho admin nâng cao:

```text
Theme Settings -> Custom CSS
```

## Multi-site

Framework nên hỗ trợ nhiều website.

Mỗi website là một `siteId`, có config/data/layout/output riêng.

Ví dụ:

```text
data/sites/tinsinhphat/
  site.json
  pages/
  layouts/
  components/
  theme-settings.json
  sync-state.json

data/sites/brand-a/
  site.json
  pages/
  layouts/
  components/
  theme-settings.json
```

Ví dụ site config:

```json
{
  "id": "tinsinhphat",
  "domain": "tinsinhphat.local",
  "source": {
    "wordpressUrl": "https://api.tinsinhphat.com",
    "woocommerce": true
  },
  "theme": "basic-shop",
  "outputDir": "dist/sites/tinsinhphat"
}
```

Nginx trỏ domain:

```text
tinsinhphat.local -> dist/sites/tinsinhphat
site-b.local      -> dist/sites/site-b
```

## Quyết định kiến trúc đã chốt

- Public site phải là static output.
- Builder là admin tool trong cùng project, không cần tách app riêng ngay từ đầu.
- Builder phải có đăng nhập admin.
- Component lớn phải expose layout/slot cho builder.
- Người dùng có thể tự tạo layout bên trong component lớn.
- Người dùng có thể tạo composite component riêng bằng JSON.
- Developer có thể tạo JS component trong theme.
- Page gán layout bằng `layoutId`.
- Layout có thể áp dụng cho exact page, content type hoặc rule.
- Landing page là một use case chính.
- Multi-site là hướng nên hỗ trợ bằng `siteId`.
- Style nên đi qua controls/tokens trước, custom CSS để phase nâng cao.

