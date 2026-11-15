<?php
// Run once via wp eval-file. All published content is clearly illustrative.
if (get_option('apex_demo_seeded')) { return; }
foreach (['Studio journal — paint preparation', 'Ceramic protection — concept guide'] as $title) {
    wp_insert_post(['post_type' => 'post', 'post_status' => 'publish', 'post_title' => $title, 'post_content' => 'Concept / demo project. A sample editorial explaining preparation, protection and ongoing care. No real customer or completed service is claimed.']);
}
$id = wp_insert_post(['post_type' => 'apex_realizacja', 'post_status' => 'publish', 'post_title' => 'GT-class — Stealth concept', 'post_content' => 'Concept / demo project. A fictional case study demonstrating a headless WordPress integration.']);
foreach (['service' => 'PPF', 'vehicle' => 'GT-class sport coupé', 'finish' => 'Graphite'] as $key => $value) { update_post_meta($id, 'apex_' . $key, $value); }
update_post_meta($id, 'apex_demo', true);
update_option('apex_demo_seeded', true);
