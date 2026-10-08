<?php
require_once __DIR__ . '/utils.php';

$deviceId = get_device_id();
$childId = child_id_for_device($deviceId);

if (!$childId) json_out(["ok"=>false, "error"=>"forbidden (child only)"], 403);

$body = read_body_json();
$qid = $body["id"] ?? "";
if (!$qid) json_out(["ok"=>false, "error"=>"missing id"], 400);

$quests = get_quests();
$changed = false;

foreach ($quests as &$q) {
    if (($q["id"] ?? "") === $qid && ($q["childId"] ?? "") === $childId) {
        if (($q["status"] ?? "") === "active") {
            $q["status"] = "pendingApproval";
            $q["completedAt"] = now_ts();
            $changed = true;
        }
        break;
    }
}

if ($changed) save_quests($quests);
json_out(["ok"=>true, "changed"=>$changed]);
