<?php
require_once __DIR__ . '/utils.php';

$deviceId = get_device_id();
require_parent($deviceId);

$pending = get_pending();

$out = [];
foreach ($pending as $dev => $info) {
    $out[] = [
        "deviceId" => $dev,
        "name" => $info["name"] ?? "",
        "ts" => $info["ts"] ?? null
    ];
}

json_out($out);
