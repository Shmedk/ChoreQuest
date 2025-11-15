<?php
header('Content-Type: application/json; charset=utf-8');

$input = json_decode(file_get_contents('php://input'), true);
if (!$input || !isset($input['title'])) {// is it emty is it a jason
    echo json_encode(['error' => 'Invalid input']);
    exit;
}

$file = __DIR__ . '/quests.json';
$fp = fopen($file, 'c+'); // read write or create
if (!$fp) {
    echo json_encode(['error' => 'Could not open file']);
    exit;
}

flock($fp, LOCK_EX);
$contents = stream_get_contents($fp);
$quests = $contents ? json_decode($contents, true) : [];
if (!is_array($quests)) $quests = [];
// array of keys and val
$new = [
    'id' => uniqid('q_', true), //id with q_ prefix True is just more random
    'title' => strip_tags($input['title']),// strip tags for safety
    'description' => strip_tags($input['description'] ?? ''),// strip tags for safety
    'reward' => strip_tags($input['reward'] ?? ''),// strip tags for safety
    'status' => 'active', // active | pendingApproval | approved
    'createdAt' => time(),// current time
    'completedAt' => null,
    'approvedAt' => null,
    'assignedTo' => $input['assignedTo'] ?? 'child',
    'notes' => $input['notes'] ?? ''
];

$quests[] = $new;

ftruncate($fp, 0); // removes old file
rewind($fp); //return to beginning
fwrite($fp, json_encode($quests, JSON_PRETTY_PRINT));// turns $quests from php  into Json and writes fp into it
fflush($fp);// empties the buffer into the file just to be sure
flock($fp, LOCK_UN);//release the lock from line 17
fclose($fp);// close the file

echo json_encode(['success' => true, 'quests' => $quests]);