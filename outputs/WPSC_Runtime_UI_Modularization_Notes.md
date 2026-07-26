# WPSC Runtime UI Modularization Notes

Ngày ghi nhận: 2026-07-18

## Mục tiêu

Runtime UI hiện vẫn nằm chủ yếu trong:

```text
src/runtime/enhanced-navigation.js
```

File này đang chạy dạng browser IIFE và được copy trực tiếp ra:

```text
examples/basic-shop/dist/wpsc-enhanced-navigation.js
```

Vì vậy không nên bẻ thành nhiều file ES module một lần nếu chưa đổi pipeline bundle. Cách an toàn là tách theo từng lớp:

```text
1. Tách helper/state trong cùng file hoặc module build-safe.
2. Chuẩn hóa API render/handler cho từng vùng.
3. Sau đó mới đổi build pipeline để bundle nhiều module thành 1 file browser.
```

## Nhóm runtime cần tách

```text
navigation/prefetch
search runtime
cart runtime
checkout runtime
thank-you/order runtime
account/auth runtime
product interaction runtime
recently viewed runtime
shared form/status helpers
```

## Đã làm trong nhịp này

```text
navigation/prefetch:
- Có cache route JSON + fragment HTML.
- Prefetch khi hover/focus/touch link nội bộ.
- Content transition tối đa 80ms.

account/user flow:
- Các form lưu địa chỉ, profile, đổi mật khẩu, gửi lại xác nhận đã có submit loading/restore.
- Tránh click submit đôi.
- Người dùng thấy trạng thái đang xử lý và kết quả.

checkout hardening:
- Khi API /api/checkout lỗi, không xóa cart, không redirect thank-you giả.
- Hiển thị lỗi ngay trên checkout.
- Payload có thêm paymentLabel và shipmentLabel để server/order note dùng rõ hơn.

performance/PWA nhỏ:
- Chưa thêm service worker.
- Ưu tiên prefetch nhẹ vì ít rủi ro hơn service worker trong giai đoạn dev.
```

## Nguyên tắc tiếp theo

```text
Không tách file vật lý runtime lớn khi chưa có bundler.
Không để checkout báo thành công nếu API tạo order thật lỗi.
Không cache account/order private data bằng prefetch.
Không áp transition lên header/footer.
```

## Bước sau

Khi cần tách thật thành nhiều file:

```text
1. Thêm script build runtime bundle.
2. Tạo src/runtime/enhanced/
3. Chuyển từng nhóm module sang export function.
4. Bundle về dist/wpsc-enhanced-navigation.js.
5. Test cart/checkout/account/search trước khi full build.
```
