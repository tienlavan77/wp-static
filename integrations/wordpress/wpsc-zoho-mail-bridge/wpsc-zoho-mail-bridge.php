<?php
/**
 * Plugin Name: WPSC Zoho Mail Bridge
 * Description: Server-side Zoho SMTP mail bridge for WPSC auth and transactional emails.
 * Version: 0.1.0
 * Author: WPSC
 * Requires at least: 6.0
 * Requires PHP: 8.0
 * Text Domain: wpsc-zoho-mail-bridge
 */

declare(strict_types=1);

if (!defined('ABSPATH')) {
    exit;
}

final class WPSC_Zoho_Mail_Bridge
{
    private const NAMESPACE = 'wpsc/v1';
    private const SECRET_HEADER = 'x-wpsc-bridge-secret';
    private static ?WP_Error $last_mail_error = null;

    public static function boot(): void
    {
        add_action('phpmailer_init', [self::class, 'configure_phpmailer'], 999);
        add_action('rest_api_init', [self::class, 'register_routes']);
    }

    public static function register_routes(): void
    {
        register_rest_route(self::NAMESPACE, '/mail/test', [
            'methods' => WP_REST_Server::CREATABLE,
            'callback' => [self::class, 'send_test_mail'],
            'permission_callback' => [self::class, 'authorize_bridge_request'],
            'args' => [
                'to' => [
                    'required' => true,
                    'sanitize_callback' => 'sanitize_email',
                    'type' => 'string',
                ],
            ],
        ]);
    }

    public static function configure_phpmailer(PHPMailer\PHPMailer\PHPMailer $phpmailer): void
    {
        if (!self::is_configured()) {
            return;
        }

        $phpmailer->isSMTP();
        $phpmailer->Mailer = 'smtp';
        $phpmailer->Host = self::constant('WPSC_ZOHO_SMTP_HOST', 'smtp.zoho.com');
        $phpmailer->Port = (int) self::constant('WPSC_ZOHO_SMTP_PORT', '587');
        $phpmailer->SMTPAuth = true;
        $phpmailer->Username = self::constant('WPSC_ZOHO_SMTP_USERNAME');
        $phpmailer->Password = self::constant('WPSC_ZOHO_SMTP_PASSWORD');
        $phpmailer->SMTPSecure = self::constant('WPSC_ZOHO_SMTP_SECURE', 'tls');

        $from = self::constant('WPSC_ZOHO_FROM_EMAIL', $phpmailer->Username);
        $from_name = self::constant('WPSC_ZOHO_FROM_NAME', get_bloginfo('name'));

        if ($from !== '') {
            $phpmailer->setFrom($from, $from_name, false);
        }
    }

    public static function send_test_mail(WP_REST_Request $request): WP_REST_Response|WP_Error
    {
        if (!self::is_configured()) {
            return new WP_Error(
                'wpsc_zoho_mail_not_configured',
                __('Zoho SMTP is not configured.', 'wpsc-zoho-mail-bridge'),
                ['status' => 501]
            );
        }

        $to = sanitize_email((string) $request->get_param('to'));

        if ($to === '' || !is_email($to)) {
            return new WP_Error(
                'wpsc_zoho_mail_invalid_email',
                __('A valid recipient email is required.', 'wpsc-zoho-mail-bridge'),
                ['status' => 400]
            );
        }

        self::$last_mail_error = null;
        add_action('wp_mail_failed', [self::class, 'capture_mail_error']);

        $sent = wp_mail(
            $to,
            __('WPSC Zoho mail test', 'wpsc-zoho-mail-bridge'),
            __('Zoho mail bridge is configured and ready for WPSC transactional emails.', 'wpsc-zoho-mail-bridge')
        );

        remove_action('wp_mail_failed', [self::class, 'capture_mail_error']);

        if (!$sent) {
            return new WP_Error(
                'wpsc_zoho_mail_failed',
                __('WordPress could not send the test email.', 'wpsc-zoho-mail-bridge'),
                [
                    'mailError' => self::$last_mail_error ? self::$last_mail_error->get_error_message() : '',
                    'mailErrorData' => self::$last_mail_error ? self::$last_mail_error->get_error_data() : null,
                    'smtpConfigured' => self::smtp_debug_payload(),
                    'status' => 500,
                ]
            );
        }

        return new WP_REST_Response([
            'ok' => true,
            'message' => __('Test email sent.', 'wpsc-zoho-mail-bridge'),
        ], 200);
    }

    public static function capture_mail_error(WP_Error $error): void
    {
        self::$last_mail_error = $error;
    }

    public static function authorize_bridge_request(WP_REST_Request $request): bool|WP_Error
    {
        $secret = self::constant('WPSC_AUTH_BRIDGE_SECRET');

        if ($secret === '') {
            return true;
        }

        $provided = (string) $request->get_header(self::SECRET_HEADER);

        if ($provided !== '' && hash_equals($secret, $provided)) {
            return true;
        }

        return new WP_Error(
            'wpsc_zoho_mail_forbidden',
            __('WPSC Zoho mail bridge request is not authorized.', 'wpsc-zoho-mail-bridge'),
            ['status' => 403]
        );
    }

    private static function is_configured(): bool
    {
        return self::constant('WPSC_ZOHO_SMTP_USERNAME') !== '' && self::constant('WPSC_ZOHO_SMTP_PASSWORD') !== '';
    }

    private static function smtp_debug_payload(): array
    {
        return [
            'fromEmail' => self::constant('WPSC_ZOHO_FROM_EMAIL'),
            'host' => self::constant('WPSC_ZOHO_SMTP_HOST', 'smtp.zoho.com'),
            'port' => self::constant('WPSC_ZOHO_SMTP_PORT', '587'),
            'secure' => self::constant('WPSC_ZOHO_SMTP_SECURE', 'tls'),
            'username' => self::constant('WPSC_ZOHO_SMTP_USERNAME'),
        ];
    }

    private static function constant(string $name, string $fallback = ''): string
    {
        if (defined($name)) {
            return trim((string) constant($name));
        }

        $value = getenv($name);

        return is_string($value) ? trim($value) : $fallback;
    }
}

WPSC_Zoho_Mail_Bridge::boot();
