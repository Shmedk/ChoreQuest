<?php
require_once __DIR__ . '/utils.php';

$deviceId = get_device_id();
require_parent($deviceId);

$children = get_children();

// return array because JS is happier with arrays than php dictionaries
$out = [];
foreach ($children as $childId => $info) {
    $out[] = [
        "childId" => $childId,
        "name" => $info["name"] ?? "Unnamed Child"
    ];
}

json_out($out);
