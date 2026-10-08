<?php
require_once __DIR__ . '/utils.php';

$body = read_body_json();

$actorDeviceId  = $body["deviceId"] ?? '';
$targetDeviceId = $body["targetDeviceId"] ?? '';
$role           = $body["role"] ?? ''; // 'parent' | 'child'

require_parent($actorDeviceId);

if (!$targetDeviceId || ($role !== "parent" && $role !== "child")) {
    json_out(["ok"=>false, "error"=>"missing targetDeviceId/role"], 400);
}

$devices  = get_devices();
$pending  = get_pending();
$children = get_children();

// remove from pending if it exists (we'll clear after assignment)
$pendingName = $pending[$targetDeviceId]["name"] ?? "";

// if we're promoting to parent, remove child mapping if any
if ($role === "parent") {
    unset($devices["childDevices"][$targetDeviceId]);

    if (!in_array($targetDeviceId, $devices["parents"])) {
        $devices["parents"][] = $targetDeviceId;
    }

    unset($pending[$targetDeviceId]);
    save_devices($devices);
    save_pending($pending);

    json_out(["ok"=>true, "role"=>"parent"]);
}

// role === child
$useExistingChildId = $body["childId"] ?? null;        // optional
$createNew          = !!($body["createNew"] ?? false); // optional
$forceName          = trim($body["name"] ?? "");       // optional override

// decide childId
$childId = $useExistingChildId;

// create new child if requested or missing
if ($createNew || !$childId) {
    $childId = "child_" . substr(md5($targetDeviceId . microtime(true)), 0, 8);
    $childName = $forceName ?: ($pendingName ?: "Unnamed Child");
    $children[$childId] = ["name" => $childName];
    save_children($children);
} else {
    // optional: when approving pending, we auto-link name to the child profile (your rule)
    if ($pendingName && isset($children[$childId])) {
        $children[$childId]["name"] = $forceName ?: $pendingName;
        save_children($children);
    }
}

// map device → childId
$devices["childDevices"][$targetDeviceId] = $childId;

// if device was in parents list, remove it (child means child)
$devices["parents"] = array_values(array_filter($devices["parents"], fn($d) => $d !== $targetDeviceId));

// clear pending entry now that it has a role
unset($pending[$targetDeviceId]);

save_devices($devices);
save_pending($pending);

json_out(["ok"=>true, "role"=>"child", "childId"=>$childId]);
