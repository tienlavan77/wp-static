# WPSC Account Auth And User Data Direction

Ngày ghi nhận: 2026-07-17

## Mục tiêu

Ghi nhận hướng xử lý login/account/user data cho WPSC để sau này khi làm phần user flow không đi sai kiến trúc bảo mật.

Yêu cầu chính từ anh:

```text
User đăng nhập qua API/admin layer.
wp-static dùng id của user đã đăng nhập để lấy mọi thông tin thuộc về user đó.
Không expose credential nhạy cảm ra browser.
Không để browser tự truyền userId rồi server tin ngay.
```

## Vai trò từng lớp

```text
Browser
  -> chỉ nhận HTML/CSS/JS
  -> gửi login form, thao tác account/cart/checkout
  -> không giữ WP token, Woo key, admin credential

wp-static runtime
  -> nhận request từ browser
  -> giữ session của user bằng cookie an toàn
  -> đọc session.userId để lấy dữ liệu user
  -> gọi API/admin layer bằng quyền server-side
  -> lọc dữ liệu trước khi trả về browser

API/admin layer
  -> xác thực login với WordPress
  -> đọc/ghi WordPress/WooCommerce bằng quyền phù hợp
  -> trả dữ liệu theo userId cho wp-static

WordPress/WooCommerce
  -> nguồn user, product, order, address, coupon, customer data
```

## Luồng login đã chốt

```text
1. User nhập email/password trên /account hoặc /login.
2. Browser POST /api/auth/login.
3. wp-static runtime nhận request.
4. wp-static gửi thông tin login tới API/admin layer.
5. API/admin layer xác thực user với WordPress.
6. Nếu đúng, API trả về user id và thông tin public cần thiết.
7. wp-static tạo session riêng:
   - userId
   - email
   - displayName
   - role/customer flags nếu cần
   - expiresAt
8. wp-static set cookie HttpOnly/Secure/SameSite.
9. Browser chỉ biết trạng thái đã đăng nhập, không thấy token nhạy cảm.
```

## Nguyên tắc lấy dữ liệu user

Sau khi login:

```text
session.userId = 123
```

wp-static dùng `session.userId` để lấy dữ liệu:

```text
profile của user 123
billing address của user 123
shipping address của user 123
orders của user 123
order detail thuộc user 123
coupon/point nếu có của user 123
wishlist nếu có của user 123
download/file nếu thuộc user 123
```

Điểm quan trọng:

```text
Dữ liệu lấy bằng quyền server-side/admin credential.
Nhưng dữ liệu trả về browser chỉ là dữ liệu thuộc đúng session.userId.
```

## Không tin userId từ browser

Không nên thiết kế API kiểu:

```text
GET /api/account/orders?userId=123
```

Vì browser có thể sửa thành:

```text
GET /api/account/orders?userId=456
```

Thiết kế đúng:

```text
GET /api/account/orders
```

Server tự đọc:

```text
session.userId
```

Sau đó gọi API/admin layer:

```text
orders where customerId = session.userId
```

## Kiểm tra quyền sở hữu dữ liệu

Với order detail:

```text
GET /api/account/orders/{orderId}
```

wp-static phải kiểm tra:

```text
order.customerId === session.userId
```

Chỉ khi đúng mới trả dữ liệu về browser.

Không trả dữ liệu nếu:

```text
order không tồn tại
order không thuộc user hiện tại
session hết hạn
user chưa đăng nhập
```

## Cookie/session bảo mật

Session cookie nên dùng:

```text
HttpOnly
Secure
SameSite=Lax hoặc SameSite=Strict
Expires/Max-Age rõ ràng
```

Browser không đọc được session token bằng JavaScript.

## Credential không được expose

Không bao giờ đưa các dữ liệu sau ra browser:

```text
WP application password
WooCommerce consumer key
WooCommerce consumer secret
admin token
server session secret
API private key
order của user khác
customer data của user khác
```

## Account API đề xuất

Public browser chỉ gọi endpoint an toàn:

```text
POST /api/auth/login
POST /api/auth/logout
GET  /api/account/me
GET  /api/account/orders
GET  /api/account/orders/{orderId}
GET  /api/account/addresses
POST /api/account/addresses
POST /api/account/profile
POST /api/account/password
```

Các endpoint này đều lấy user hiện tại từ session, không lấy userId từ query/body để quyết định quyền truy cập.

## Checkout/order liên quan user

Khi user đã đăng nhập:

```text
checkout dùng session.userId
order tạo ra gắn với userId đó
billing/shipping có thể lấy từ account data
thankyou/order detail chỉ hiển thị nếu order thuộc userId đó
```

Khi user chưa đăng nhập:

```text
checkout guest có thể được cho phép hoặc không tùy config
nếu guest checkout, order không gắn userId hoặc gắn bằng email
account page không hiển thị order guest nếu chưa xác minh email/session
```

## Quyết định chốt

```text
API/admin layer xác thực user.
wp-static giữ session user.
wp-static dùng session.userId để lấy đầy đủ dữ liệu thuộc user đó.
wp-static dùng quyền server-side/admin credential khi cần.
Browser chỉ nhận dữ liệu đã lọc và đã xác minh ownership.
```

Đây là hướng triển khai chính thức cho phần login/account/user flow sau này.

