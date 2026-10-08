// auth.js
// this file decides who you are and kicks you out if you try to sneak into parent land
// device id is the "login" because passwords are pain and kids are chaos

// backend base is set by the page (relative hard-coded, page knows where it lives)
// if page forgets to set it, we default to ./backend and pray
const AUTH_BACKEND =
  (typeof AUTH_BACKEND_OVERRIDE !== 'undefined') ? AUTH_BACKEND_OVERRIDE : './backend';

let _roleCache = null; // cache bc i refuse to ask php the same question 400 times

function getDeviceId() {
  let id = localStorage.getItem('deviceId');

  // browser won't give real device ids so we do the classic "fine i'll do it myself"
  if (!id) {
    id = (crypto && crypto.randomUUID) ? crypto.randomUUID() : `dev_${Math.random().toString(16).slice(2)}_${Date.now()}`;
    localStorage.setItem('deviceId', id);
  }

  return id;
}

async function fetchRoleFresh() {
  const deviceId = getDeviceId();
  const res = await fetch(`${AUTH_BACKEND}/getRole.php?deviceId=${encodeURIComponent(deviceId)}`);
  const data = await res.json();

  _roleCache = data; // keep it in memory
  return data;
}

async function getRole() {
  if (_roleCache) return _roleCache;
  return fetchRoleFresh();
}

function isParentDebugBypass(roleObj) {
  // this is your "temporary view everything" switch.
  // easy to remove: set config parentDebugMode=false OR just stop toggling debugView in localStorage.
  if (!roleObj) return false;
  const debugAllowed = roleObj.role === 'parent' && roleObj.debug === true;
  const userEnabled = localStorage.getItem('debugView') === '1';
  return debugAllowed && userEnabled;
}

async function enforceRole(allowedRoles, redirectTo) {
  const r = await getRole();

  // parent debug view can see everything (for debugging + development)
  // but children never get this luxury, welcome to being short.
  if (isParentDebugBypass(r)) return r;

  if (!allowedRoles.includes(r.role)) {
    window.location.replace(redirectTo);
    return null;
  }

  return r;
}

async function routeFromRoot() {
  const r = await getRole();

  // if parent debug view is on, still route normally. debug doesn't mean chaos by default.
  if (r.role === 'parent') {
    window.location.replace('./parent/index.html');
    return;
  }
  if (r.role === 'child') {
    window.location.replace('./child/index.html');
    return;
  }

  // unregistered stays on root index
  return;
}

// expose tiny api so index.js can use it without re-inventing the wheel
window.CQ_AUTH = {
  getDeviceId,
  getRole,
  fetchRoleFresh,
  enforceRole,
  routeFromRoot,
  isParentDebugBypass
};
