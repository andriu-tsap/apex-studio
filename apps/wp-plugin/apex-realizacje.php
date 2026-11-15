<?php
/**
 * Plugin Name: APEX Realizacje
 * Description: Demo project case studies with validated metadata and headless REST support.
 * Version: 1.0.0
 * Author: Andrii Tsap
 * License: MIT
 */
if (!defined('ABSPATH')) { exit; }
add_action('init', function () {
    register_post_type('apex_realizacja', [
        'labels' => ['name' => 'Realizacje', 'singular_name' => 'Realizacja'],
        'public' => true,
        'show_in_rest' => true,
        'rest_base' => 'apex_realizacja',
        'supports' => ['title', 'editor', 'thumbnail', 'custom-fields'],
        'has_archive' => true,
        'rewrite' => ['slug' => 'realizacje'],
    ]);
    foreach (['service', 'vehicle', 'finish'] as $field) {
        register_post_meta('apex_realizacja', 'apex_' . $field, [
            'type' => 'string', 'single' => true, 'show_in_rest' => true,
            'sanitize_callback' => 'sanitize_text_field',
            'auth_callback' => function ($allowed, $meta_key, $post_id) {
                return current_user_can('edit_post', $post_id);
            },
        ]);
    }
    register_post_meta('apex_realizacja', 'apex_demo', [
        'type' => 'boolean', 'single' => true, 'default' => true, 'show_in_rest' => true,
        'sanitize_callback' => 'rest_sanitize_boolean',
        'auth_callback' => function ($allowed, $meta_key, $post_id) { return current_user_can('edit_post', $post_id); },
    ]);
});
add_action('add_meta_boxes', function () {
    add_meta_box('apex_details', 'APEX — Concept / demo project', function ($post) {
        wp_nonce_field('apex_save_details', 'apex_nonce');
        foreach (['service', 'vehicle', 'finish'] as $field) {
            echo '<p><label>' . esc_html(ucfirst($field)) . '<br><input style="width:100%" name="apex_' . esc_attr($field) . '" value="' . esc_attr(get_post_meta($post->ID, 'apex_' . $field, true)) . '"></label></p>';
        }
    }, 'apex_realizacja');
});
add_action('save_post_apex_realizacja', function ($post_id) {
    if (!isset($_POST['apex_nonce']) || !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['apex_nonce'])), 'apex_save_details')) { return; }
    if ((defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) || !current_user_can('edit_post', $post_id)) { return; }
    foreach (['service', 'vehicle', 'finish'] as $field) {
        if (isset($_POST['apex_' . $field])) { update_post_meta($post_id, 'apex_' . $field, sanitize_text_field(wp_unslash($_POST['apex_' . $field]))); }
    }
    update_post_meta($post_id, 'apex_demo', true);
});
register_activation_hook(__FILE__, function () { do_action('init'); flush_rewrite_rules(); });
register_deactivation_hook(__FILE__, function () { flush_rewrite_rules(); });
