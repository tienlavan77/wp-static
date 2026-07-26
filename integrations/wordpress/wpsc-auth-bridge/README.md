# WPSC Auth Bridge

Small WordPress plugin that exposes secure customer auth endpoints for WPSC runtime.

## Endpoint

```text
POST /wp-json/wpsc/v1/auth/login
POST /wp-json/wpsc/v1/auth/register
POST /wp-json/wpsc/v1/auth/lost-password
POST /wp-json/wpsc/v1/auth/reset-password
POST /wp-json/wpsc/v1/auth/change-password
POST /wp-json/wpsc/v1/auth/verify-email
POST /wp-json/wpsc/v1/auth/resend-verification
```

Request body:

```json
{
  "username": "customer@example.com",
  "password": "customer-password"
}
```

Success response:

```json
{
  "user": {
    "id": 123,
    "email": "customer@example.com",
    "displayName": "Customer Name",
    "username": "customer",
    "roles": ["customer"]
  }
}
```

Failed login response:

```json
{
  "code": "wpsc_auth_bridge_invalid_credentials",
  "message": "Invalid username or password.",
  "data": {
    "status": 401
  }
}
```

## Security

The plugin does not return WordPress cookies, WordPress tokens, application passwords,
WooCommerce consumer keys, or WooCommerce consumer secrets.

WPSC runtime stores the returned user id in its own HTTP-only session cookie, then uses
server-side WooCommerce credentials to fetch customer data for that user id.

## Shared Secret

For production, define a long random secret in `wp-config.php`:

```php
define('WPSC_AUTH_BRIDGE_SECRET', 'replace-with-a-long-random-secret');
define('WPSC_ACCOUNT_URL', 'https://tinsinhphat.local/account');
```

Then set the same value in the WPSC runtime environment:

```text
WPSC_AUTH_BRIDGE_SECRET=replace-with-a-long-random-secret
```

Runtime requests include:

```text
X-WPSC-Bridge-Secret: replace-with-a-long-random-secret
```

If `WPSC_AUTH_BRIDGE_SECRET` is not defined in WordPress, the endpoint still works,
but this should only be used for local development.

`WPSC_ACCOUNT_URL` is used in verification and reset-password emails. It must point
to the public WPSC storefront account page, not the WordPress API domain.

## Email Features

The plugin sends email through normal WordPress `wp_mail()`. Install and configure
`wpsc-zoho-mail-bridge` or another SMTP plugin before enabling production flows:

- account registration welcome/verification email
- resend verification email
- lost password email
- reset password link

Verification and reset tokens are stored hashed in user meta and expire after 24 hours.

## Rate Limit

The plugin rate-limits failed login attempts by IP and username:

```text
8 failed attempts / 10 minutes
```

## Install

Copy the plugin folder to WordPress:

```text
wp-content/plugins/wpsc-auth-bridge/
```

Activate it in WordPress Admin:

```text
Plugins -> WPSC Auth Bridge -> Activate
```

## Test

```bash
curl -i https://api.tinsinhphat.com/wp-json/wpsc/v1/auth/login \
  -H 'content-type: application/json' \
  -H 'x-wpsc-bridge-secret: replace-with-a-long-random-secret' \
  --data '{"username":"customer@example.com","password":"customer-password"}'
```
