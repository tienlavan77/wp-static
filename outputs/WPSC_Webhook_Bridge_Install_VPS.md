# WPSC Webhook Bridge Install On VPS

Ngày tạo: 2026-07-18

## Plugin đã tạo

```text
integrations/wordpress/wpsc-webhook-bridge/
```

Plugin này gửi webhook từ WordPress/WooCommerce về WPSC receiver khi:

```text
post/page/product publish/update/trash/delete
product_variation publish/update/trash/delete, tự map về product cha
category/tag/product_cat/product_tag create/update/delete
```

## 1. Dò đường dẫn WordPress trên VPS

```bash
ssh tienlavan@192.168.1.181 'find /home/data/sites -maxdepth 5 -type d -name wp-content 2>/dev/null'
```

Ví dụ nếu kết quả là:

```text
/home/data/sites/api.tinsinhphat.com/public/wp-content
```

thì thư mục WordPress root là:

```text
/home/data/sites/api.tinsinhphat.com/public
```

## 2. Rsync plugin lên VPS

Thay đúng đường dẫn `wp-content` tìm được:

```bash
rsync -av integrations/wordpress/wpsc-webhook-bridge/ tienlavan@192.168.1.181:/home/data/sites/api.tinsinhphat.com/public/wp-content/plugins/wpsc-webhook-bridge/
```

Nếu đường dẫn khác, thay phần:

```text
/home/data/sites/api.tinsinhphat.com/public/wp-content
```

## 3. Cấu hình wp-config.php

Thêm:

```php
define('WPSC_WEBHOOK_TARGET_URL', 'http://127.0.0.1:8787/webhook/rebuild');
define('WPSC_WEBHOOK_SECRET', 'replace-with-a-long-random-secret');
define('WPSC_WEBHOOK_DEBOUNCE_SECONDS', 8);
define('WPSC_WEBHOOK_TIMEOUT_SECONDS', 8);
define('WPSC_WEBHOOK_ENABLED', true);
define('WPSC_WEBHOOK_SEND_IMMEDIATELY', true);
```

Lưu ý:

```text
WPSC_WEBHOOK_TARGET_URL phải trỏ tới WPSC webhook receiver, không phải website static thường.
Secret này phải trùng với WPSC_WEBHOOK_SECRET khi chạy receiver.
WPSC_WEBHOOK_SEND_IMMEDIATELY=true phù hợp môi trường dev để bấm Save trong WP là receiver báo nhận ngay.
Production có thể bỏ constant này để dùng debounce qua WP-Cron.
```

## 4. Chạy WPSC webhook receiver

Trong project wp-static trên VPS:

```bash
cd /home/data/sites/wp-static
WPSC_WEBHOOK_SECRET='replace-with-a-long-random-secret' node src/cli/index.js webhook --project examples/basic-shop --port 8787
```

Endpoint receiver:

```text
POST http://127.0.0.1:8787/webhook/rebuild
```

## 5. Active plugin

Trong WordPress Admin:

```text
Plugins -> WPSC Webhook Bridge -> Activate
```

## 6. Test status

```bash
curl https://api.tinsinhphat.com/wp-json/wpsc/v1/webhook/status
```

Kỳ vọng:

```json
{
  "enabled": true,
  "targetConfigured": true,
  "secretConfigured": true
}
```

## 7. Test gửi webhook thủ công

```bash
curl -X POST https://api.tinsinhphat.com/wp-json/wpsc/v1/webhook/test \
  -H 'content-type: application/json' \
  -H 'x-wpsc-webhook-secret: replace-with-a-long-random-secret'
```

Nếu receiver đang chạy và secret đúng, response sẽ `200`.

## 8. Test thực tế

```text
1. Sửa title/mô tả một product trong WooCommerce.
2. Bấm Update.
3. Đợi debounce khoảng 8 giây.
4. Kiểm tra WPSC receiver log.
5. Refresh route product/category tương ứng.
```

## Ghi chú quan trọng

Hiện WPSC receiver mặc định là:

```text
/webhook/rebuild
```

Không phải:

```text
/api/webhooks/rebuild
```

Nếu sau này muốn gom chung vào runtime `serve:runtime:example`, cần thêm bridge route ở runtime server hoặc chạy webhook receiver như một service riêng.
