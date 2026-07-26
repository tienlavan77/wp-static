# WPSC Zoho Mail Bridge

Plugin WordPress dung de gui email giao dich cho WPSC qua Zoho SMTP.

## Trang thai

Day la nen tang cho cac phase sau:

- Quen mat khau.
- Dang ky tai khoan.
- Xac nhan email.
- Email giao dich don hang.

## Cau hinh trong `wp-config.php`

```php
define('WPSC_AUTH_BRIDGE_SECRET', 'same-secret-as-runtime');
define('WPSC_ZOHO_SMTP_HOST', 'smtp.zoho.com');
define('WPSC_ZOHO_SMTP_PORT', '587');
define('WPSC_ZOHO_SMTP_SECURE', 'tls');
define('WPSC_ZOHO_SMTP_USERNAME', 'no-reply@example.com');
define('WPSC_ZOHO_SMTP_PASSWORD', 'zoho-app-password');
define('WPSC_ZOHO_FROM_EMAIL', 'no-reply@example.com');
define('WPSC_ZOHO_FROM_NAME', 'Tin Sinh Phat');
```

## Test send

```bash
curl -X POST https://api.tinsinhphat.com/wp-json/wpsc/v1/mail/test \
  -H 'content-type: application/json' \
  -H 'x-wpsc-bridge-secret: same-secret-as-runtime' \
  -d '{"to":"customer@example.com"}'
```

## Nguyen tac bao mat

- Zoho credential chi nam o WordPress/server.
- Browser khong goi truc tiep Zoho.
- Request tu WPSC runtime sang plugin dung `x-wpsc-bridge-secret`.
- Cac endpoint register, verify email, lost password se dung mail bridge nay khi minh quay lai auth nang cao.
