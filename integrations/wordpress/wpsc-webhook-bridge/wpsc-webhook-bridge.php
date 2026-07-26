<?php
/**
 * Plugin Name: WPSC Webhook Bridge
 * Description: Sends WordPress and WooCommerce content-change webhooks to a WPSC rebuild receiver.
 * Version: 0.1.0
 * Author: WPSC
 * Text Domain: wpsc-webhook-bridge
 */

if (!defined('ABSPATH')) {
    exit;
}

final class WPSC_Webhook_Bridge {
    private const CRON_HOOK = 'wpsc_webhook_bridge_flush_queue';
    private const OPTION_QUEUE = 'wpsc_webhook_bridge_queue';
    private const OPTION_LAST_RESULT = 'wpsc_webhook_bridge_last_result';
    private const REST_NAMESPACE = 'wpsc/v1';

    public static function init(): void {
        $instance = new self();
        add_action('transition_post_status', [$instance, 'handle_post_transition'], 10, 3);
        add_action('before_delete_post', [$instance, 'handle_delete_post'], 10, 1);
        add_action('trashed_post', [$instance, 'handle_trashed_post'], 10, 1);
        add_action('created_term', [$instance, 'handle_term_created'], 10, 3);
        add_action('edited_term', [$instance, 'handle_term_edited'], 10, 3);
        add_action('delete_term', [$instance, 'handle_term_delete'], 10, 4);
        add_action(self::CRON_HOOK, [$instance, 'flush_queue']);
        add_action('rest_api_init', [$instance, 'register_rest_routes']);
    }

    public function handle_post_transition(string $new_status, string $old_status, WP_Post $post): void {
        if (!$this->should_track_post($post)) {
            return;
        }

        if ($new_status === 'auto-draft' || $new_status === 'inherit') {
            return;
        }

        if ($new_status === 'trash') {
            $action = 'unpublish';
        } elseif ($old_status === 'auto-draft' || $old_status === 'draft') {
            $action = 'publish';
        } else {
            $action = 'update';
        }

        $this->enqueue_change($this->post_to_change($post), $action);
    }

    public function handle_delete_post(int $post_id): void {
        $post = get_post($post_id);

        if (!$post || !$this->should_track_post($post)) {
            return;
        }

        $this->enqueue_change($this->post_to_change($post), 'delete');
    }

    public function handle_trashed_post(int $post_id): void {
        $post = get_post($post_id);

        if (!$post || !$this->should_track_post($post)) {
            return;
        }

        $this->enqueue_change($this->post_to_change($post), 'unpublish');
    }

    public function handle_term_created(int $term_id, int $tt_id, string $taxonomy): void {
        $this->handle_term_change($term_id, $taxonomy, 'create');
    }

    public function handle_term_edited(int $term_id, int $tt_id, string $taxonomy): void {
        $this->handle_term_change($term_id, $taxonomy, 'update');
    }

    private function handle_term_change(int $term_id, string $taxonomy, string $action): void {
        $term = get_term($term_id, $taxonomy);

        if (!$term || is_wp_error($term) || !$this->should_track_taxonomy($taxonomy)) {
            return;
        }

        $this->enqueue_change($this->term_to_change($term, $taxonomy), $action);
    }

    public function handle_term_delete(int $term_id, int $tt_id, string $taxonomy, $deleted_term): void {
        if (!$this->should_track_taxonomy($taxonomy)) {
            return;
        }

        $slug = '';

        if ($deleted_term instanceof WP_Term) {
            $slug = $deleted_term->slug;
        }

        $this->enqueue_change([
            'type' => 'term',
            'id' => (string) $term_id,
            'slug' => $this->normalize_slug($slug),
            'taxonomy' => $taxonomy,
        ], 'delete');
    }

    public function register_rest_routes(): void {
        register_rest_route(self::REST_NAMESPACE, '/webhook/status', [
            'methods' => WP_REST_Server::READABLE,
            'callback' => [$this, 'rest_status'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route(self::REST_NAMESPACE, '/webhook/test', [
            'methods' => WP_REST_Server::CREATABLE,
            'callback' => [$this, 'rest_test'],
            'permission_callback' => [$this, 'rest_authorized'],
        ]);
    }

    public function rest_status(): WP_REST_Response {
        return new WP_REST_Response([
            'enabled' => $this->enabled(),
            'sendImmediately' => $this->send_immediately(),
            'targetConfigured' => $this->target_url() !== '',
            'secretConfigured' => $this->secret() !== '',
            'queueSize' => count($this->queue()),
            'lastResult' => get_option(self::OPTION_LAST_RESULT, null),
        ], 200);
    }

    public function rest_test(WP_REST_Request $request): WP_REST_Response {
        $payload = [
            'source' => 'wordpress',
            'action' => 'update',
            'eventId' => $this->event_id('test'),
            'changed' => [[
                'type' => 'page',
                'id' => '0',
                'slug' => 'wpsc-webhook-test',
                'taxonomy' => null,
            ]],
        ];
        $result = $this->send_payload($payload);

        return new WP_REST_Response($result, !empty($result['ok']) ? 200 : 500);
    }

    public function rest_authorized(WP_REST_Request $request): bool {
        $secret = $this->secret();

        if ($secret === '') {
            return current_user_can('manage_options');
        }

        return hash_equals($secret, (string) $request->get_header('x-wpsc-webhook-secret'));
    }

    public function flush_queue(): void {
        $queue = $this->queue();

        if (!$queue) {
            return;
        }

        update_option(self::OPTION_QUEUE, [], false);
        $payload = [
            'source' => $this->dominant_source($queue),
            'action' => $this->dominant_action($queue),
            'eventId' => $this->event_id('flush'),
            'changed' => array_values($this->dedupe_changes(array_column($queue, 'change'))),
        ];

        $this->send_payload($payload);
    }

    private function enqueue_change(array $change, string $action): void {
        if (!$this->enabled() || $this->target_url() === '') {
            return;
        }

        if ($this->send_immediately()) {
            $payload = [
                'source' => $this->source_for_change($change),
                'action' => $action,
                'eventId' => $this->event_id('immediate'),
                'changed' => [$change],
            ];
            $this->send_payload($payload);
            return;
        }

        $queue = $this->queue();
        $queue[] = [
            'action' => $action,
            'change' => $change,
            'queuedAt' => gmdate('c'),
            'source' => $this->source_for_change($change),
        ];
        update_option(self::OPTION_QUEUE, $queue, false);
        $this->schedule_flush();
    }

    private function schedule_flush(): void {
        if (wp_next_scheduled(self::CRON_HOOK)) {
            return;
        }

        wp_schedule_single_event(time() + $this->debounce_seconds(), self::CRON_HOOK);
    }

    private function send_payload(array $payload): array {
        if ($this->target_url() === '') {
            $result = [
                'ok' => false,
                'error' => 'WPSC_WEBHOOK_TARGET_URL is not configured.',
                'sentAt' => gmdate('c'),
            ];
            update_option(self::OPTION_LAST_RESULT, $result, false);
            return $result;
        }

        $response = wp_remote_post($this->target_url(), [
            'body' => wp_json_encode($payload),
            'headers' => [
                'content-type' => 'application/json',
                'x-wpsc-webhook-secret' => $this->secret(),
                'x-wpsc-webhook-source' => 'wordpress',
            ],
            'timeout' => $this->timeout_seconds(),
        ]);

        if (is_wp_error($response)) {
            $result = [
                'ok' => false,
                'error' => $response->get_error_message(),
                'payload' => $payload,
                'sentAt' => gmdate('c'),
            ];
            update_option(self::OPTION_LAST_RESULT, $result, false);
            return $result;
        }

        $status = (int) wp_remote_retrieve_response_code($response);
        $body = (string) wp_remote_retrieve_body($response);
        $result = [
            'ok' => $status >= 200 && $status < 300,
            'status' => $status,
            'body' => $body,
            'payload' => $payload,
            'sentAt' => gmdate('c'),
        ];
        update_option(self::OPTION_LAST_RESULT, $result, false);

        return $result;
    }

    private function should_track_post(WP_Post $post): bool {
        if (wp_is_post_revision($post->ID) || wp_is_post_autosave($post->ID)) {
            return false;
        }

        $type = $post->post_type;

        if ($this->starts_with($type, 'revision') || $this->starts_with($type, 'acf-')) {
            return false;
        }

        return in_array($type, $this->tracked_post_types(), true);
    }

    private function should_track_taxonomy(string $taxonomy): bool {
        return in_array($taxonomy, $this->tracked_taxonomies(), true);
    }

    private function post_to_change(WP_Post $post): array {
        if ($post->post_type === 'product_variation') {
            $parent = $post->post_parent ? get_post($post->post_parent) : null;

            if ($parent instanceof WP_Post) {
                return [
                    'type' => 'product',
                    'id' => (string) $parent->ID,
                    'slug' => $this->normalize_slug($parent->post_name),
                    'taxonomy' => null,
                ];
            }
        }

        return [
            'type' => $post->post_type,
            'id' => (string) $post->ID,
            'slug' => $this->normalize_slug($post->post_name),
            'taxonomy' => null,
        ];
    }

    private function term_to_change(WP_Term $term, string $taxonomy): array {
        return [
            'type' => 'term',
            'id' => (string) $term->term_id,
            'slug' => $this->normalize_slug($term->slug),
            'taxonomy' => $taxonomy,
        ];
    }

    private function dedupe_changes(array $changes): array {
        $deduped = [];

        foreach ($changes as $change) {
            if (!is_array($change)) {
                continue;
            }

            $key = implode(':', [
                $change['type'] ?? '',
                $change['taxonomy'] ?? '',
                $change['id'] ?? '',
                $change['slug'] ?? '',
            ]);
            $deduped[$key] = $change;
        }

        return $deduped;
    }

    private function dominant_source(array $queue): string {
        foreach ($queue as $entry) {
            if (($entry['source'] ?? '') === 'woocommerce') {
                return 'woocommerce';
            }
        }

        return 'wordpress';
    }

    private function dominant_action(array $queue): string {
        $action = $queue[count($queue) - 1]['action'] ?? 'update';

        return in_array($action, ['create', 'update', 'delete', 'publish', 'unpublish'], true)
            ? $action
            : 'update';
    }

    private function source_for_change(array $change): string {
        $type = $change['type'] ?? '';
        $taxonomy = $change['taxonomy'] ?? '';

        return $type === 'product' || $type === 'product_variation' || $taxonomy === 'product_cat' || $taxonomy === 'product_tag'
            ? 'woocommerce'
            : 'wordpress';
    }

    private function queue(): array {
        $queue = get_option(self::OPTION_QUEUE, []);

        return is_array($queue) ? $queue : [];
    }

    private function tracked_post_types(): array {
        $default = ['post', 'page', 'product', 'product_variation'];

        if (defined('WPSC_WEBHOOK_POST_TYPES') && is_array(WPSC_WEBHOOK_POST_TYPES)) {
            return array_values(array_filter(WPSC_WEBHOOK_POST_TYPES, 'is_string'));
        }

        return $default;
    }

    private function tracked_taxonomies(): array {
        $default = ['category', 'post_tag', 'product_cat', 'product_tag'];

        if (defined('WPSC_WEBHOOK_TAXONOMIES') && is_array(WPSC_WEBHOOK_TAXONOMIES)) {
            return array_values(array_filter(WPSC_WEBHOOK_TAXONOMIES, 'is_string'));
        }

        return $default;
    }

    private function target_url(): string {
        return defined('WPSC_WEBHOOK_TARGET_URL') ? esc_url_raw((string) WPSC_WEBHOOK_TARGET_URL) : '';
    }

    private function secret(): string {
        return defined('WPSC_WEBHOOK_SECRET') ? (string) WPSC_WEBHOOK_SECRET : '';
    }

    private function enabled(): bool {
        return !defined('WPSC_WEBHOOK_ENABLED') || (bool) WPSC_WEBHOOK_ENABLED;
    }

    private function send_immediately(): bool {
        return defined('WPSC_WEBHOOK_SEND_IMMEDIATELY') && (bool) WPSC_WEBHOOK_SEND_IMMEDIATELY;
    }

    private function debounce_seconds(): int {
        $seconds = defined('WPSC_WEBHOOK_DEBOUNCE_SECONDS') ? (int) WPSC_WEBHOOK_DEBOUNCE_SECONDS : 8;
        return max(1, min(120, $seconds));
    }

    private function timeout_seconds(): int {
        $seconds = defined('WPSC_WEBHOOK_TIMEOUT_SECONDS') ? (int) WPSC_WEBHOOK_TIMEOUT_SECONDS : 8;
        return max(1, min(30, $seconds));
    }

    private function event_id(string $prefix): string {
        return sprintf('wpsc_%s_%s_%s', $prefix, gmdate('YmdHis'), wp_generate_password(8, false, false));
    }

    private function normalize_slug(string $slug): string {
        return trim($slug, "/ \t\n\r\0\x0B");
    }

    private function starts_with(string $value, string $prefix): bool {
        return substr($value, 0, strlen($prefix)) === $prefix;
    }
}

WPSC_Webhook_Bridge::init();
