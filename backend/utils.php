<?php
// tiny php toolbox so we don't copy-paste the same misery everywhere

function json_out($data, $code = 200) {
    http_response_code($code);
    header('Content-Type: application/json');
    echo json_encode($data, JSON_PRETTY_PRINT);
    exit;
}

function read_json_locked($path, $default) {
    // file locking so two requests don't smash the json into soup
    if (!file_exists($path)) return $default;

    $fp = fopen($path, 'c+');
    if (!$fp) return $default;

    flock($fp, LOCK_SH);
    $raw = stream_get_contents($fp);
    flock($fp, LOCK_UN);
    fclose($fp);

    $data = json_decode($raw ?: '', true);
    return (json_last_error() === JSON_ERROR_NONE) ? $data : $default;
}

function write_json_locked($path, $data) {
    $fp = fopen($path, 'c+');
    if (!$fp) return false;

    flock($fp, LOCK_EX);
    ftruncate($fp, 0);
    rewind($fp);
    fwrite($fp, json_encode($data, JSON_PRETTY_PRINT));
    fflush($fp);
    flock($fp, LOCK_UN);
    fclose($fp);

    return true;
}

function read_body_json() {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw ?: '{}', true);
    return is_array($data) ? $data : [];
}

function path_devices() { return __DIR__ . '/devices.json'; }
function path_children() { return __DIR__ . '/children.json'; }
function path_pending() { return __DIR__ . '/pending.json'; }
function path_quests()  { return __DIR__ . '/quests.json'; }
function path_config()  { return __DIR__ . '/config.json'; }

function now_ts() { return time(); }

function get_device_id() {
    // supports ?deviceId=... and json body {deviceId: ...}
    $q = $_GET['deviceId'] ?? '';
    if ($q) return $q;

    $b = read_body_json();
    return $b['deviceId'] ?? '';
}

function get_devices() {
    $d = read_json_locked(path_devices(), ["parents"=>[], "childDevices"=>[]]);
    if (!isset($d["parents"]) || !is_array($d["parents"])) $d["parents"] = [];
    if (!isset($d["childDevices"]) || !is_array($d["childDevices"])) $d["childDevices"] = [];
    return $d;
}

function save_devices($devices) {
    return write_json_locked(path_devices(), $devices);
}

function get_children() {
    $c = read_json_locked(path_children(), []);
    return is_array($c) ? $c : [];
}

function save_children($children) {
    return write_json_locked(path_children(), $children);
}

function get_pending() {
    $p = read_json_locked(path_pending(), []);
    return is_array($p) ? $p : [];
}

function save_pending($pending) {
    return write_json_locked(path_pending(), $pending);
}

function get_quests() {
    $q = read_json_locked(path_quests(), []);
    return is_array($q) ? $q : [];
}

function save_quests($quests) {
    return write_json_locked(path_quests(), $quests);
}

function get_config() {
    $c = read_json_locked(path_config(), ["parentDebugMode"=>true]);
    return is_array($c) ? $c : ["parentDebugMode"=>true];
}

function is_parent($deviceId) {
    $devices = get_devices();
    return in_array($deviceId, $devices["parents"]);
}

function child_id_for_device($deviceId) {
    $devices = get_devices();
    return $devices["childDevices"][$deviceId] ?? null;
}

function require_parent($deviceId) {
    if (!$deviceId || !is_parent($deviceId)) {
        json_out(["ok"=>false, "error"=>"forbidden (parent only)"], 403);
    }
}
