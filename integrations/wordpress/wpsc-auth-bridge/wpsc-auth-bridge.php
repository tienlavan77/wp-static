<?php
/**
 * Plugin Name: WPSC Auth Bridge
 * Description: Secure customer login bridge for WPSC static commerce runtime.
 * Version: 0.1.0
 * Author: WPSC
 * Requires at least: 6.0
 * Requires PHP: 8.0
 * Text Domain: wpsc-auth-bridge
 */

declare(strict_types=1);

if (!defined('ABSPATH')) {
    exit;
}

final class WPSC_Auth_Bridge
{
    private const NAMESPACE = 'wpsc/v1';
    private const ROUTE_LOGIN = '/auth/login';
    private const ROUTE_REGISTER = '/auth/register';
    private const ROUTE_LOST_PASSWORD = '/auth/lost-password';
    private const ROUTE_RESET_PASSWORD = '/auth/reset-password';
    private const ROUTE_CHANGE_PASSWORD = '/auth/change-password';
    private const ROUTE_VERIFY_EMAIL = '/auth/verify-email';
    private const ROUTE_RESEND_VERIFY_EMAIL = '/auth/resend-verification';
    private const SECRET_HEADER = 'x-wpsc-bridge-secret';
    private const RATE_LIMIT_PREFIX = 'wpsc_auth_bridge_login_';
    private const VERIFY_META_KEY = '_wpsc_email_verified';
    private const VERIFY_TOKEN_META_KEY = '_wpsc_verify_email_token';
    private const VERIFY_EXPIRES_META_KEY = '_wpsc_verify_email_expires';
    private const RESET_TOKEN_META_KEY = '_wpsc_reset_password_token';
    private const RESET_EXPIRES_META_KEY = '_wpsc_reset_password_expires';
    private const RATE_LIMIT_MAX_ATTEMPTS = 8;
    private const RATE_LIMIT_WINDOW_SECONDS = 600;

    public static function boot(): void
    {
        add_action('rest_api_init', [self::class, 'register_routes']);
    }

    public static function register_routes(): void
    {
        register_rest_route(self::NAMESPACE, self::ROUTE_LOGIN, [
            'methods' => WP_REST_Server::CREATABLE,
            'callback' => [self::class, 'login'],
            'permission_callback' => [self::class, 'authorize_bridge_request'],
            'args' => [
                'username' => [
                    'required' => true,
                    'sanitize_callback' => 'sanitize_text_field',
                    'type' => 'string',
                ],
                'password' => [
                    'required' => true,
                    'type' => 'string',
                ],
            ],
        ]);

        register_rest_route(self::NAMESPACE, self::ROUTE_LOST_PASSWORD, [
            'methods' => WP_REST_Server::CREATABLE,
            'callback' => [self::class, 'lost_password'],
            'permission_callback' => [self::class, 'authorize_bridge_request'],
            'args' => [
                'username' => [
                    'required' => true,
                    'sanitize_callback' => 'sanitize_text_field',
                    'type' => 'string',
                ],
            ],
        ]);

        register_rest_route(self::NAMESPACE, self::ROUTE_REGISTER, [
            'methods' => WP_REST_Server::CREATABLE,
            'callback' => [self::class, 'register'],
            'permission_callback' => [self::class, 'authorize_bridge_request'],
        ]);

        register_rest_route(self::NAMESPACE, self::ROUTE_RESET_PASSWORD, [
            'methods' => WP_REST_Server::CREATABLE,
            'callback' => [self::class, 'reset_password'],
            'permission_callback' => [self::class, 'authorize_bridge_request'],
        ]);

        register_rest_route(self::NAMESPACE, self::ROUTE_CHANGE_PASSWORD, [
            'methods' => WP_REST_Server::CREATABLE,
            'callback' => [self::class, 'change_password'],
            'permission_callback' => [self::class, 'authorize_bridge_request'],
        ]);

        register_rest_route(self::NAMESPACE, self::ROUTE_VERIFY_EMAIL, [
            'methods' => WP_REST_Server::CREATABLE,
            'callback' => [self::class, 'verify_email'],
            'permission_callback' => [self::class, 'authorize_bridge_request'],
        ]);

        register_rest_route(self::NAMESPACE, self::ROUTE_RESEND_VERIFY_EMAIL, [
            'methods' => WP_REST_Server::CREATABLE,
            'callback' => [self::class, 'resend_verification'],
            'permission_callback' => [self::class, 'authorize_bridge_request'],
        ]);
    }

    public static function authorize_bridge_request(WP_REST_Request $request): bool|WP_Error
    {
        $secret = self::bridge_secret();

        if ($secret === '') {
            return true;
        }

        $provided = (string) $request->get_header(self::SECRET_HEADER);

        if ($provided !== '' && hash_equals($secret, $provided)) {
            return true;
        }

        return new WP_Error(
            'wpsc_auth_bridge_forbidden',
            __('WPSC auth bridge request is not authorized.', 'wpsc-auth-bridge'),
            ['status' => 403]
        );
    }

    public static function login(WP_REST_Request $request): WP_REST_Response|WP_Error
    {
        $username = trim((string) $request->get_param('username'));
        $password = (string) $request->get_param('password');
        $rate_key = self::rate_limit_key($request, $username);

        if (self::is_rate_limited($rate_key)) {
            return new WP_Error(
                'wpsc_auth_bridge_rate_limited',
                __('Too many login attempts. Please try again later.', 'wpsc-auth-bridge'),
                ['status' => 429]
            );
        }

        if ($username === '' || $password === '') {
            self::record_failed_attempt($rate_key);

            return new WP_Error(
                'wpsc_auth_bridge_missing_credentials',
                __('Username and password are required.', 'wpsc-auth-bridge'),
                ['status' => 400]
            );
        }

        $user = wp_authenticate($username, $password);

        if (is_wp_error($user)) {
            self::record_failed_attempt($rate_key);

            return new WP_Error(
                'wpsc_auth_bridge_invalid_credentials',
                __('Invalid username or password.', 'wpsc-auth-bridge'),
                ['status' => 401]
            );
        }

        if (!$user instanceof WP_User) {
            self::record_failed_attempt($rate_key);

            return new WP_Error(
                'wpsc_auth_bridge_invalid_user',
                __('Unable to authenticate this user.', 'wpsc-auth-bridge'),
                ['status' => 401]
            );
        }

        delete_transient($rate_key);

        return new WP_REST_Response([
            'user' => self::public_user_payload($user),
        ], 200);
    }

    public static function lost_password(WP_REST_Request $request): WP_REST_Response|WP_Error
    {
        $username = trim((string) $request->get_param('username'));

        if ($username === '') {
            return new WP_Error(
                'wpsc_auth_bridge_missing_username',
                __('Email or username is required.', 'wpsc-auth-bridge'),
                ['status' => 400]
            );
        }

        $user = get_user_by('login', $username);

        if (!$user && is_email($username)) {
            $user = get_user_by('email', $username);
        }

        if ($user instanceof WP_User) {
            self::send_reset_password_email($user);
        }

        return new WP_REST_Response([
            'ok' => true,
            'message' => __('If the account exists, a password reset email has been sent.', 'wpsc-auth-bridge'),
        ], 200);
    }

    public static function register(WP_REST_Request $request): WP_REST_Response|WP_Error
    {
        $email = sanitize_email((string) $request->get_param('email'));
        $password = (string) $request->get_param('password');
        $first_name = sanitize_text_field((string) $request->get_param('firstName'));
        $last_name = sanitize_text_field((string) $request->get_param('lastName'));
        $phone = sanitize_text_field((string) $request->get_param('phone'));

        if ($email === '' || !is_email($email)) {
            return new WP_Error('wpsc_auth_bridge_invalid_email', __('A valid email is required.', 'wpsc-auth-bridge'), ['status' => 400]);
        }

        if (email_exists($email)) {
            return new WP_Error('wpsc_auth_bridge_email_exists', __('This email is already registered.', 'wpsc-auth-bridge'), ['status' => 409]);
        }

        if (strlen($password) < 8) {
            return new WP_Error('wpsc_auth_bridge_weak_password', __('Password must be at least 8 characters.', 'wpsc-auth-bridge'), ['status' => 400]);
        }

        $email_parts = explode('@', $email);
        $username = sanitize_user((string) $email_parts[0], true);
        $base_username = $username !== '' ? $username : 'customer';
        $index = 1;

        while (username_exists($username)) {
            $username = $base_username . $index;
            $index++;
        }

        $user_id = wp_insert_user([
            'user_email' => $email,
            'user_login' => $username,
            'user_pass' => $password,
            'first_name' => $first_name,
            'last_name' => $last_name,
            'display_name' => trim($first_name . ' ' . $last_name) ?: $email,
            'role' => 'customer',
        ]);

        if (is_wp_error($user_id)) {
            return $user_id;
        }

        update_user_meta((int) $user_id, 'billing_phone', $phone);
        update_user_meta((int) $user_id, self::VERIFY_META_KEY, '0');
        self::send_verify_email(get_user_by('id', (int) $user_id));

        return new WP_REST_Response([
            'ok' => true,
            'message' => __('Account created. Please check your email to verify your address.', 'wpsc-auth-bridge'),
            'user' => self::public_user_payload(get_user_by('id', (int) $user_id)),
        ], 201);
    }

    public static function reset_password(WP_REST_Request $request): WP_REST_Response|WP_Error
    {
        $login = sanitize_text_field((string) $request->get_param('login'));
        $token = sanitize_text_field((string) $request->get_param('token'));
        $password = (string) $request->get_param('password');
        $user = $login !== '' ? get_user_by('login', $login) : false;

        if (!$user instanceof WP_User || $token === '' || strlen($password) < 8) {
            return new WP_Error('wpsc_auth_bridge_invalid_reset', __('Reset token or password is invalid.', 'wpsc-auth-bridge'), ['status' => 400]);
        }

        if (!self::token_is_valid($user, self::RESET_TOKEN_META_KEY, self::RESET_EXPIRES_META_KEY, $token)) {
            return new WP_Error('wpsc_auth_bridge_invalid_reset_token', __('Reset token is invalid or expired.', 'wpsc-auth-bridge'), ['status' => 400]);
        }

        wp_set_password($password, (int) $user->ID);
        delete_user_meta((int) $user->ID, self::RESET_TOKEN_META_KEY);
        delete_user_meta((int) $user->ID, self::RESET_EXPIRES_META_KEY);

        return new WP_REST_Response(['ok' => true, 'message' => __('Password has been reset.', 'wpsc-auth-bridge')], 200);
    }

    public static function change_password(WP_REST_Request $request): WP_REST_Response|WP_Error
    {
        $user_id = (int) $request->get_param('userId');
        $current = (string) $request->get_param('currentPassword');
        $next = (string) $request->get_param('newPassword');
        $user = $user_id > 0 ? get_user_by('id', $user_id) : false;

        if (!$user instanceof WP_User || !wp_check_password($current, $user->user_pass, $user->ID)) {
            return new WP_Error('wpsc_auth_bridge_invalid_current_password', __('Current password is not correct.', 'wpsc-auth-bridge'), ['status' => 401]);
        }

        if (strlen($next) < 8) {
            return new WP_Error('wpsc_auth_bridge_weak_password', __('Password must be at least 8 characters.', 'wpsc-auth-bridge'), ['status' => 400]);
        }

        wp_set_password($next, (int) $user->ID);

        return new WP_REST_Response(['ok' => true, 'message' => __('Password has been changed. Please log in again.', 'wpsc-auth-bridge')], 200);
    }

    public static function verify_email(WP_REST_Request $request): WP_REST_Response|WP_Error
    {
        $login = sanitize_text_field((string) $request->get_param('login'));
        $token = sanitize_text_field((string) $request->get_param('token'));
        $user = $login !== '' ? get_user_by('login', $login) : false;

        if (!$user instanceof WP_User || !self::token_is_valid($user, self::VERIFY_TOKEN_META_KEY, self::VERIFY_EXPIRES_META_KEY, $token)) {
            return new WP_Error('wpsc_auth_bridge_invalid_verify_token', __('Verification token is invalid or expired.', 'wpsc-auth-bridge'), ['status' => 400]);
        }

        update_user_meta((int) $user->ID, self::VERIFY_META_KEY, '1');
        delete_user_meta((int) $user->ID, self::VERIFY_TOKEN_META_KEY);
        delete_user_meta((int) $user->ID, self::VERIFY_EXPIRES_META_KEY);

        return new WP_REST_Response(['ok' => true, 'message' => __('Email has been verified.', 'wpsc-auth-bridge')], 200);
    }

    public static function resend_verification(WP_REST_Request $request): WP_REST_Response|WP_Error
    {
        $email = sanitize_email((string) $request->get_param('email'));
        $user = $email !== '' ? get_user_by('email', $email) : false;

        if ($user instanceof WP_User && get_user_meta((int) $user->ID, self::VERIFY_META_KEY, true) !== '1') {
            self::send_verify_email($user);
        }

        return new WP_REST_Response([
            'ok' => true,
            'message' => __('If the account needs verification, a new email has been sent.', 'wpsc-auth-bridge'),
        ], 200);
    }

    private static function public_user_payload(WP_User $user): array
    {
        return [
            'id' => (int) $user->ID,
            'email' => (string) $user->user_email,
            'displayName' => (string) $user->display_name,
            'username' => (string) $user->user_login,
            'roles' => array_values(array_map('strval', (array) $user->roles)),
            'emailVerified' => get_user_meta((int) $user->ID, self::VERIFY_META_KEY, true) === '1',
        ];
    }

    private static function send_verify_email(WP_User|false $user): void
    {
        if (!$user instanceof WP_User) {
            return;
        }

        $token = self::create_user_token($user, self::VERIFY_TOKEN_META_KEY, self::VERIFY_EXPIRES_META_KEY);
        $url = self::account_url([
            'verify_login' => $user->user_login,
            'verify_token' => $token,
        ]);

        wp_mail(
            $user->user_email,
            __('Verify your email address', 'wpsc-auth-bridge'),
            sprintf(__('Please verify your email address: %s', 'wpsc-auth-bridge'), $url)
        );
    }

    private static function send_reset_password_email(WP_User $user): void
    {
        $token = self::create_user_token($user, self::RESET_TOKEN_META_KEY, self::RESET_EXPIRES_META_KEY);
        $url = self::account_url([
            'reset_login' => $user->user_login,
            'reset_token' => $token,
        ]);

        wp_mail(
            $user->user_email,
            __('Reset your password', 'wpsc-auth-bridge'),
            sprintf(__('Reset your password here: %s', 'wpsc-auth-bridge'), $url)
        );
    }

    private static function create_user_token(WP_User $user, string $token_key, string $expires_key): string
    {
        $token = wp_generate_password(32, false, false);
        update_user_meta((int) $user->ID, $token_key, wp_hash_password($token));
        update_user_meta((int) $user->ID, $expires_key, (string) (time() + DAY_IN_SECONDS));

        return $token;
    }

    private static function token_is_valid(WP_User $user, string $token_key, string $expires_key, string $token): bool
    {
        $hash = (string) get_user_meta((int) $user->ID, $token_key, true);
        $expires = (int) get_user_meta((int) $user->ID, $expires_key, true);

        return $hash !== '' && $token !== '' && $expires >= time() && wp_check_password($token, $hash);
    }

    private static function account_url(array $params): string
    {
        $base = defined('WPSC_ACCOUNT_URL') ? (string) constant('WPSC_ACCOUNT_URL') : home_url('/account');

        return add_query_arg($params, $base);
    }

    private static function bridge_secret(): string
    {
        if (defined('WPSC_AUTH_BRIDGE_SECRET')) {
            return trim((string) constant('WPSC_AUTH_BRIDGE_SECRET'));
        }

        $env_secret = getenv('WPSC_AUTH_BRIDGE_SECRET');

        return is_string($env_secret) ? trim($env_secret) : '';
    }

    private static function rate_limit_key(WP_REST_Request $request, string $username): string
    {
        $ip = self::client_ip($request);
        $identity = strtolower($username !== '' ? $username : 'unknown');

        return self::RATE_LIMIT_PREFIX . md5($ip . '|' . $identity);
    }

    private static function client_ip(WP_REST_Request $request): string
    {
        $forwarded = (string) $request->get_header('x-forwarded-for');

        if ($forwarded !== '') {
            $parts = explode(',', $forwarded);
            return trim((string) $parts[0]);
        }

        return isset($_SERVER['REMOTE_ADDR']) ? sanitize_text_field((string) $_SERVER['REMOTE_ADDR']) : 'unknown';
    }

    private static function is_rate_limited(string $key): bool
    {
        $attempts = (int) get_transient($key);

        return $attempts >= self::RATE_LIMIT_MAX_ATTEMPTS;
    }

    private static function record_failed_attempt(string $key): void
    {
        $attempts = (int) get_transient($key);
        set_transient($key, $attempts + 1, self::RATE_LIMIT_WINDOW_SECONDS);
    }
}

WPSC_Auth_Bridge::boot();
