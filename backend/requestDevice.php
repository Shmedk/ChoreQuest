<?php
require_once __DIR__ . '/utils.php';

$body = read_body_json();
$deviceId = $body["deviceId"] ?? '';
$name = trim($body["name"] ?? '');

if (!$deviceId || !$name) {
    json_out(["ok"=>false, "error"=>"missing deviceId/name"], 400);
}

$pending = get_pending();

// store/update request. parent will see it.
$pending[$deviceId] = [
    "name" => $name,
    "ts" => now_ts()
];

save_pending($pending);
json_out(["ok"=>true]);
