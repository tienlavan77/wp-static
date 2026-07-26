# WPSC Theme System And User Theme Requirements

Ngày ghi nhận: 2026-07-17

## Mục tiêu

WPSC không chỉ là một website tĩnh cho một domain. Mục tiêu dài hạn là trở thành framework có thể tạo nhiều website tĩnh, mỗi website có thể chọn theme riêng, thay theme, cấu hình theme, và cho người dùng tự tạo theme.

Yêu cầu quan trọng từ anh:

```text
Theme phải tách độc lập khỏi dự án hiện tại.
Theme có thể tái sử dụng cho site khác.
Người dùng có thể tự tạo theme, tải theme lên, chọn theme để sử dụng.
```

## Hiện trạng

Theme hiện tại đang nằm trong:

```text
examples/basic-shop/theme/
```

Một phần lớn code giao diện đang tập trung trong:

```text
examples/basic-shop/theme/components/storefrontShell.js
```

Điều này phù hợp cho giai đoạn làm nhanh storefront thật, nhưng chưa phải cấu trúc lâu dài nếu WPSC muốn hỗ trợ nhiều theme và nhiều website.

## Hướng kiến trúc đã chốt

Theme nên trở thành một package độc lập:

```text
themes/
  tinsinhphat-storefront/
    theme.json
    layouts/
    components/
    styles/
    assets/
    README.md

  user-theme-name/
    theme.json
    layouts/
    components/
    styles/
    assets/
    README.md
```

Site project chỉ chọn theme và truyền settings:

```text
sites/
  tinsinhphat/
    wpsc.config.js
    .env
    public/
    content-overrides/
```

Ví dụ config:

```js
export default {
  site: {
    id: "tinsinhphat",
    title: "Tín Sinh Phát",
    url: "https://tinsinhphat.com"
  },

  theme: {
    id: "tinsinhphat-storefront",
    settings: {
      brandName: "Tín Sinh Phát",
      shortName: "TSP",
      primaryColor: "#0c6349",
      phone: "0987 59 68 79",
      email: "tien.lavan@tinsinhphat.com",
      address: "Số 2 Đông Hồ, Phường Tân Hoà, TP.HCM"
    }
  }
};
```

## Theme Manifest

Mỗi theme cần có file manifest:

```text
theme.json
```

Ví dụ:

```json
{
  "id": "tinsinhphat-storefront",
  "name": "Tín Sinh Phát Storefront",
  "version": "1.0.0",
  "author": "Tín Sinh Phát",
  "entry": "layouts/index.js",
  "style": "styles/storefront.css",
  "settingsSchema": "theme.settings.schema.json",
  "supports": [
    "home",
    "page",
    "post",
    "product",
    "product_cat",
    "search",
    "cart",
    "checkout",
    "thankyou",
    "account"
  ]
}
```

## Theme Contract

Core framework không nên biết chi tiết giao diện của từng theme. Theme cũng không nên biết WordPress/WooCommerce nằm bên dưới thế nào.

Framework truyền cho theme dữ liệu chuẩn:

```js
export default function productLayout({
  content,
  graph,
  route,
  html,
  themeSettings,
  helpers
}) {
  return "";
}
```

Theme chỉ nên dùng:

```text
content
graph
route
html
themeSettings
helpers
```

Không nên để theme gọi trực tiếp WordPress API, WooCommerce API, hoặc đọc env credentials.

## Component Structure Đã Bắt Đầu Tách

Theme Tín Sinh Phát hiện đã bắt đầu tách component trong:

```text
examples/basic-shop/theme/components/
```

Nhóm component hiện có:

```text
account/
archive/
category/
commerce/
footer/
header/
navigation/
product/
sections/
shared/
```

Nguyên tắc sử dụng:

```text
components/index.js là public barrel export cho code mới.
components/storefrontShell.js là compatibility layer cho layout cũ.
Component chỉ render HTML từ dữ liệu đã truyền vào.
Component không gọi API thật, không đọc .env, không biết Woo key/WP key.
```

Khi tách theme độc lập về sau, các nhóm component này là lõi để chuyển sang:

```text
themes/tinsinhphat-storefront/
```

## Tạo Theme Mới

Về sau cần có lệnh:

```bash
npx wpsc create-theme my-theme
```

Lệnh này sinh ra:

```text
my-theme/
  theme.json
  layouts/
    home.js
    page.js
    post.js
    product.js
    archive.js
    search.js
    cart.js
    checkout.js
    thankyou.js
    account.js
  components/
    header.js
    footer.js
    banner.js
    breadcrumbs.js
    productCard.js
    categoryCard.js
  styles/
    theme.css
  assets/
  README.md
```

## Upload Và Chọn Theme

Sau này trong admin/builder cần có phần:

```text
Giao diện
├── Theme đang dùng
├── Tải theme lên
├── Xem trước theme
├── Kích hoạt theme
├── Cấu hình theme
└── Xóa theme
```

Luồng đề xuất:

1. Người dùng tải file theme lên.
2. Hệ thống giải nén vào thư mục themes hoặc site themes.
3. Hệ thống đọc `theme.json`.
4. Validate theme id, version, entry, style, supported layouts.
5. Cho preview theme trước khi kích hoạt.
6. Khi kích hoạt, site config trỏ sang theme mới.
7. Build lại các route cần thiết.

## Theme Settings

Những dữ liệu không nên hard-code trong theme:

```text
brand name
logo
short logo text
primary color
accent color
font family
container width
phone
email
address
social links
bank account
QR payment settings
footer links
header menu
```

Các dữ liệu này nên lấy từ:

```text
theme.settings
site settings
WordPress menu/content
```

## Lộ trình đề xuất sau này

### Theme Phase 1: Tách component trong theme hiện tại

Không đổi giao diện. Chỉ tách code:

```text
storefrontShell.js
header.js
footer.js
banner.js
productCard.js
categoryCard.js
whyChooseUs.js
utils.js
```

### Theme Phase 2: Tách theme ra khỏi examples/basic-shop

Di chuyển theme hiện tại thành:

```text
themes/tinsinhphat-storefront/
```

Site hiện tại chỉ chọn theme qua config.

### Theme Phase 3: Theme manifest và loader

Thêm:

```text
theme.json
resolveTheme()
validateThemeManifest()
loadThemeLayout()
loadThemeStyle()
```

### Theme Phase 4: Theme settings schema

Cho theme khai báo settings có thể chỉnh:

```text
theme.settings.schema.json
```

Admin/builder sau này dựa vào schema để tạo form cấu hình.

### Theme Phase 5: Create theme command

Thêm lệnh:

```bash
wpsc create-theme my-theme
```

### Theme Phase 6: Upload, preview, activate theme

Làm trong admin/builder sau khi storefront và user flow ổn định.

## Quyết định tạm thời

Không làm theme system ngay lúc này.

Lý do:

- Storefront thật vẫn chưa hoàn tất toàn bộ user/account flow.
- Theme hiện tại còn đang được chỉnh giao diện liên tục.
- Nếu tách theme system quá sớm sẽ làm chậm tiến độ ra website hoàn chỉnh.

Hướng đúng:

```text
Hoàn chỉnh storefront trước.
Sau đó tách component.
Sau đó tách theme thành package.
Cuối cùng mới làm create/upload/choose theme.
```
