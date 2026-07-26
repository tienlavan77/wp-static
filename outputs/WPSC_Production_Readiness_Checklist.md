# WPSC Production Readiness Checklist

Ngày kiểm tra: 2026-07-18

## Kết luận nhanh

```text
Trạng thái: READY FOR INTERNAL PILOT
Chưa nên public bán rộng ngay vì QR ngân hàng còn placeholder và chưa tạo test order thật có chủ ý.
```

## 1. Runtime/Env `[pass]`

Đã kiểm:

```text
WPSC_WP_URL: set
WPSC_AUTH_ENDPOINT: set
WPSC_AUTH_BRIDGE_SECRET: set
WPSC_WOO_CONSUMER_KEY: set
WPSC_WOO_CONSUMER_SECRET: set
Runtime local: http://localhost:8787
/health: 200
```

Không in secret ra log/checklist.

## 2. Static Routes `[pass]`

Smoke test:

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

Không thấy:

```text
[object Object]
TypeError
ReferenceError
Cannot read
```

## 3. Account Privacy Boundary `[pass]`

Đã kiểm:

```text
GET /api/account/me khi chưa đăng nhập: 200 authenticated=false
GET /api/account/orders/1 khi chưa đăng nhập: 401 Authentication required
```

Code audit:

```text
Account/order/address/profile/change-password đều lấy userId từ server-side session.
Browser không được chọn userId.
Order detail kiểm tra order.customer_id phải đúng userId.
```

## 4. Auth/Email Endpoint Contract `[pass]`

Đã kiểm endpoint qua runtime:

```text
POST /api/auth/verify-email {}       -> 400 invalid/expired token
POST /api/auth/register {}           -> 400 valid email required
POST /api/auth/reset-password {}     -> 400 invalid reset token/password
POST /api/auth/resend-verification {} -> 200 safe generic response
```

Kết luận:

```text
Runtime contract ổn.
Response không lộ user/email có tồn tại hay không ở resend verification.
```

Cần test tay trước public:

```text
Đăng ký email thật.
Click link verify email thật.
Quên mật khẩu thật.
Reset mật khẩu thật.
```

## 5. Checkout/Order Runtime `[pass-code, needs-real-order-test]`

Test automated:

```text
node --test test/commerceRuntime.test.js
13/13 passed
```

Đã kiểm bằng test:

```text
Woo order payload có productId.
Woo order payload có variationId.
Woo order payload có quantity.
Woo order payload có customer_id từ session nếu user đăng nhập.
Shipping fee map vào shipping_lines.
Coupon map vào coupon_lines.
Payment/shipment label lưu vào meta_data.
Public order lookup bắt buộc match contact nếu có contact.
```

Frontend checkout đã harden:

```text
Nếu /api/checkout lỗi: không redirect thank-you giả.
Nếu /api/checkout lỗi: không xóa cart/coupon.
Nếu /api/checkout thành công: mới lưu last-order, clear cart/coupon, đi thank-you.
```

Chưa tự tạo order thật vì sẽ phát sinh dữ liệu WooCommerce production.

## 6. QR Chuyển Khoản `[blocker]`

Hiện tại còn placeholder:

```text
accountNumber: CAP_NHAT_SO_TAI_KHOAN
bankCode: CAP_NHAT_MA_NGAN_HANG
bankName: Cập nhật ngân hàng
```

Tác động:

```text
Thank-you vẫn hiển thị hướng chuyển khoản.
QR VietQR chưa dùng được cho khách thật.
```

Cần chốt trước public:

```text
Bank code VietQR.
Số tài khoản.
Tên chủ tài khoản.
Tên ngân hàng hiển thị.
```

## 7. Asset/Cache `[pass]`

Đã kiểm:

```text
storefront.css?v=ui-23
wpsc-enhanced-navigation.js?v=28
```

Navigation:

```text
Prefetch route JSON + fragment khi hover/focus/touch.
Content transition tối đa 80ms.
Header/footer không animate.
```

## 8. Build Consistency `[pass]`

Đã build lại:

```text
/checkout
/thank-you
```

Trước public nên chạy thêm full build một lần:

```text
npm run build:example
```

## 9. Secret Rotation `[required-before-public]`

Vì trong quá trình dev có secret từng được paste trong chat/log, trước production nên rotate:

```text
WooCommerce consumer key/secret.
WPSC auth bridge secret.
WP application password nếu đã paste.
Zoho SMTP password nếu đã paste.
```

## Final Gate

Có thể pilot nội bộ:

```text
YES
```

Public bán hàng rộng:

```text
NOT YET
```

Điều kiện để chuyển sang public:

```text
1. Cấu hình QR ngân hàng thật.
2. Tạo 1 order test thật từ browser và xác nhận order vào Woo đúng.
3. Test email register/verify/forgot/reset bằng email thật.
4. Rotate secrets.
5. Full build và kiểm nhanh mobile product/cart/checkout.
```
