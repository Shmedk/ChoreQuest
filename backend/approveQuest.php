<?php
require_once __DIR__ . '/utils.php';

$deviceId = get_device_id();
require_parent($deviceId);

$body = read_body_json();
$qid = $body["id"] ?? "";
if (!$qid) json_out(["ok"=>false, "error"=>"missing id"], 400);

$quests = get_quests();
$changed = false;

foreach ($quests as &$q) {
    if (($q["id"] ?? "") === $qid) {
        if (($q["status"] ?? "") === "pendingApproval") {
            $q["status"] = "approved";
            $q["approvedAt"] = now_ts();
            $changed = true;
        }
        break;
    }
}

if ($changed) save_quests($quests);
json_out(["ok"=>true, "changed"=>$changed]);
