<?php
header('Content-Type: application/json; charset=utf-8');

$file = __DIR__ . '/quests.json';
if (!file_exists($file)) {
    file_put_contents($file, json_encode([]));
}

$data = file_get_contents($file);
if ($data === false) {
    echo json_encode(['error' => 'Could not read quests file']);
    exit;
}

echo $data;