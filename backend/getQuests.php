<?php
require_once __DIR__ . '/utils.php';

$deviceId = get_device_id();
$quests = get_quests();

if (is_parent($deviceId)) {
    json_out($quests);
}

$childId = child_id_for_device($deviceId);
if ($childId) {
    $filtered = array_values(array_filter($quests, fn($q) => ($q["childId"] ?? "") === $childId));
    json_out($filtered);
}

json_out([]); // unregistered gets nothing
