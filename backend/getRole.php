<?php
require_once __DIR__ . '/utils.php';

$deviceId = $_GET['deviceId'] ?? '';
$devices = get_devices();

// somebody_has_to_start_the_family:
// fresh install, no parents yet.
// first device becomes parent so the app can actually function.
if ($deviceId && empty($devices["parents"])) {
    $devices["parents"][] = $deviceId;
    save_devices($devices);
}

$config = get_config();
$debug = !!($config["parentDebugMode"] ?? true);

if ($deviceId && in_array($deviceId, $devices["parents"])) {
    json_out(["role"=>"parent", "debug"=>$debug]);
}

$childId = $deviceId ? ($devices["childDevices"][$deviceId] ?? null) : null;
if ($childId) {
    $children = get_children();
    $name = $children[$childId]["name"] ?? null;
    json_out(["role"=>"child", "childId"=>$childId, "name"=>$name]);
}

$pending = get_pending();
if ($deviceId && isset($pending[$deviceId])) {
    json_out(["role"=>"unregistered", "pendingName"=>$pending[$deviceId]["name"] ?? null]);
}

json_out(["role"=>"unregistered"]);
