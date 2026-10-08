<?php
require_once __DIR__ . '/utils.php';

$deviceId = get_device_id();
require_parent($deviceId);

$body = read_body_json();
$title = trim($body["title"] ?? "");
$description = trim($body["description"] ?? "");
$reward = trim($body["reward"] ?? "");
$childId = trim($body["childId"] ?? ""); // parent chooses which child

if (!$title || !$childId) {
    json_out(["ok"=>false, "error"=>"missing title/childId"], 400);
}

$children = get_children();
if (!isset($children[$childId])) {
    json_out(["ok"=>false, "error"=>"invalid childId"], 400);
}

$quests = get_quests();

$id = "q_" . substr(md5($title . microtime(true)), 0, 10);

$quests[] = [
    "id" => $id,
    "childId" => $childId,
    "title" => $title,
    "description" => $description,
    "reward" => $reward,
    "status" => "active",
    "createdAt" => now_ts(),
    "completedAt" => null,
    "approvedAt" => null
];

save_quests($quests);
json_out(["ok"=>true, "id"=>$id]);
