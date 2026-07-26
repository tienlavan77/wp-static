# WPSC Runtime Backend Audit Checklist

Ngày audit: 2026-07-18

## 1. Checkout Real Order Audit `[done]`

Đã kiểm tra:

```text
Checkout gửi order qua runtime /api/checkout.
Runtime gọi WooCommerce server-side, không lộ Woo key ra frontend.
Order payload map productId, variationId, quantity.
Order payload map customer_id từ session.user.id nếu user đăng nhập.
Shipping fee map sang Woo shipping_lines.
Payment method map sang Woo payment_method/payment_method_title.
Coupon map sang Woo coupon_lines và meta _wpsc_coupon.
Ghi chú, payment label, shipment label lưu vào meta_data.
Frontend không redirect thank-you giả nếu /api/checkout lỗi.
Frontend không xóa cart/coupon nếu tạo order lỗi.
```

Test đã chạy:

```text
node --test test/commerceRuntime.test.js
```

Kết quả:

```text
13/13 passed
```

## 2. Account Real Data Audit `[done]`

Đã kiểm tra:

```text
/api/account/me chỉ lấy userId từ session server-side.
/api/account/orders/:id yêu cầu session user.
Order detail kiểm tra order.customer_id phải đúng userId.
Address update dùng userId từ session.
Profile update dùng userId từ session.
Change password yêu cầu session và clear session khi đổi thành công.
Frontend account form có trạng thái submit, tránh click đôi.
```

Test đã chạy:

```text
node --test test/commerceRuntime.test.js
```

Kết quả:

```text
13/13 passed
```

## 3. Email Flow Audit `[done]`

Đã kiểm tra ở mức runtime/plugin contract:

```text
Runtime có endpoint register.
Runtime có endpoint verify email.
Runtime có endpoint lost password.
Runtime có endpoint reset password.
Runtime có endpoint resend verification.
Runtime proxy sang WordPress auth bridge.
Auth bridge README ghi rõ Zoho/wp_mail requirement.
Frontend có loading/status cho register, reset, verify, resend.
```

Lưu ý:

```text
Email gửi thật phụ thuộc plugin WordPress đang active và SMTP Zoho.
PHP lint cần chạy trên môi trường có PHP/WordPress.
```

## 4. Order Lifecycle Audit `[done]`

Đã kiểm tra:

```text
Checkout thành công lưu last order.
Checkout thành công clear cart/coupon.
Thank-you đọc last order để hiển thị mã đơn.
Thank-you có QR chuyển khoản theo bank config.
Track order gọi /api/orders/lookup.
Order lookup public bắt buộc match contact email/phone nếu có contact.
Account order detail chỉ trả order thuộc user đăng nhập.
Product trong order detail có permalink nếu Woo trả hoặc service attach được từ product slug.
```

Test đã chạy:

```text
node --test test/commerceRuntime.test.js
```

Kết quả:

```text
13/13 passed
```

## 5. Data/Build Consistency Audit `[done]`

Đã kiểm tra:

```text
Route mẫu build riêng bằng npm run build:route.
Runtime static route vẫn phục vụ flat dist.
URL không tồn tại trả 404.html với HTTP 404.
Asset version đã bump để browser lấy JS mới.
```

Route đã smoke test:

```text
200 /
200 /in-brochure
200 /to-roi-a4-giay-couche-150gsm
200 /search
200 /account
200 /cart
200 /checkout
200 /thank-you
404 /duong-dan-khong-co
```

## Kết Luận

```text
Audit 1-5 done.
Runtime/backend đủ điều kiện tiếp tục kiểm thử thao tác thật trên browser.
Điểm cần nhớ trước production: rotate các secret đã từng paste trong chat/log, chạy PHP lint/plugin test trên VPS/WordPress.
```
