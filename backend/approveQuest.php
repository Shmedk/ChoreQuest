<?php
header('Content-Type: application/json; charset=utf-8');
$input = json_decode(file_get_contents('php://input'), true);
if (!$input || !isset($input['id'])) { echo json_encode(['error'=>'Invalid input']); exit; }

$file = __DIR__ . '/quests.json';
$fp = fopen($file, 'c+');
if (!$fp) { echo json_encode(['error'=>'Could not open file']); exit; }

flock($fp, LOCK_EX);
$contents = stream_get_contents($fp);
$quests = $contents ? json_decode($contents, true) : [];
if (!is_array($quests)) $quests = [];

$found = false;
foreach ($quests as &$q) {
    if ($q['id'] === $input['id']) {
        $q['status'] = 'approved';
        $q['approvedAt'] = time();
        $found = true;
        break;
    }
}
unset($q);

if (!$found) {
    flock($fp, LOCK_UN);
    fclose($fp);
    echo json_encode(['error'=>'Quest not found']);
    exit;
}

ftruncate($fp, 0);
rewind($fp);
fwrite($fp, json_encode($quests, JSON_PRETTY_PRINT));
fflush($fp);
flock($fp, LOCK_UN);
fclose($fp);

echo json_encode(['success'=>true, 'quests'=>$quests]);
