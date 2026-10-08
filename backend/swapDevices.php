<?php
require_once __DIR__ . '/utils.php';

$body = read_body_json();

$actorDeviceId = $body["deviceId"] ?? '';
$deviceA = $body["deviceA"] ?? '';
$deviceB = $body["deviceB"] ?? '';

require_parent($actorDeviceId);

if (!$deviceA || !$deviceB) {
    json_out(["ok"=>false, "error"=>"missing deviceA/deviceB"], 400);
}

$devices = get_devices();

$aChild = $devices["childDevices"][$deviceA] ?? null;
$bChild = $devices["childDevices"][$deviceB] ?? null;

if (!$aChild || !$bChild) {
    json_out(["ok"=>false, "error"=>"both devices must be child devices to swap"], 400);
}

// swap
$devices["childDevices"][$deviceA] = $bChild;
$devices["childDevices"][$deviceB] = $aChild;

save_devices($devices);

json_out(["ok"=>true, "deviceA"=>$deviceA, "deviceB"=>$deviceB, "childA"=>$bChild, "childB"=>$aChild]);
