<?php
require_once __DIR__ . '/utils.php';

$deviceId = get_device_id();
require_parent($deviceId);

$body = read_body_json();
$qid = $body["id"] ?? "";
if (!$qid) json_out(["ok"=>false, "error"=>"missing id"], 400);

$quests = get_quests();
$before = count($quests);

$quests = array_values(array_filter($quests, fn($q) => ($q["id"] ?? "") !== $qid));

save_quests($quests);
json_out(["ok"=>true, "deleted" => ($before !== count($quests))]);
