// index.js
// main brain of the app. if this breaks, it's my fault. if it works, it's also my fault. tragic.

// backend base is set by the page (relative hard-coded)
// root pages: './backend' , parent/child pages: '../backend'
const API_BASE =
  (typeof API_BASE_OVERRIDE !== 'undefined') ? API_BASE_OVERRIDE : './backend';

// status strings in one place so i stop typo'ing myself into bugs
const STATUS = {
  ACTIVE: 'active',
  PENDING: 'pendingApproval',
  APPROVED: 'approved'
};

// tiny wrapper around fetch() so i don't lose my sanity , spoiler i still lost it
async function api(path, method = 'GET', body = null) {
  const deviceId = window.CQ_AUTH?.getDeviceId?.() || localStorage.getItem('deviceId') || '';

  const opts = { method, headers: {} };

  // GET needs deviceId in query (php likes query strings)
  let url = `${API_BASE}/${path}`;
  if (method === 'GET') {
    url += (url.includes('?') ? '&' : '?') + `deviceId=${encodeURIComponent(deviceId)}`;
  }

  if (body) {
    // if we have a body, we are POSTing something
    // aka "sending data to the php goblin"
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify({ deviceId, ...body });
  }

  const res = await fetch(url, opts);
  // if php explodes, at least make it obvious
  if (!res.ok) {
    let text = '';
    try { text = await res.text(); } catch (_) {}
    throw new Error(`API ${path} failed (${res.status}) ${text}`);
  }
  return res.json();
}

// keeps our html safe from kids doing "<script>alert(1)</script>" tricks
function escapeHtml(str = '') {
  return String(str).replace(/[&<>"']/g, (m) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));
}

// formats timestamp into something we humans can read
function formatTime(ts) {
  if (!ts) return '-';
  const d = new Date(ts * 1000);
  return d.toLocaleString();
}

// ---- Quests ----

async function loadQuests() {
  const data = await api('getQuests.php', 'GET');
  let quests = Array.isArray(data) ? data : (data.quests || []);

  const previewChildId = localStorage.getItem('previewChildId');
  const role = await CQ_AUTH.getRole();

  if (
      previewChildId &&
      role.role === 'parent' &&
      CQ_AUTH.isParentDebugBypass(role)
  ) {
    quests = quests.filter(q => q.childId === previewChildId);
  }

  return quests;

}

function computeStats(quests) {
  const total = quests.length;
  const active = quests.filter(q => q.status === STATUS.ACTIVE).length;
  const pending = quests.filter(q => q.status === STATUS.PENDING).length;
  const approved = quests.filter(q => q.status === STATUS.APPROVED).length;
  const pct = total ? Math.round((approved / total) * 100) : 0;
  return { total, active, pending, approved, pct };
}

function renderStats(quests) {
  const stats = computeStats(quests);
  const el = document.getElementById('stats');
  if (!el) return;

  el.innerHTML = `
    <div><strong>Total:</strong> ${stats.total}</div>
    <div><strong>Active:</strong> ${stats.active}</div>
    <div><strong>Pending:</strong> ${stats.pending}</div>
    <div><strong>Approved:</strong> ${stats.approved}</div>
    <div><strong>Done:</strong> ${stats.pct}%</div>
  `;
}

// ---- Parent debug badge ----

async function renderDebugBadge() {
  const badge = document.getElementById('debug-badge');
  if (!badge) return;

  const roleObj = await window.CQ_AUTH.getRole();
  if (roleObj.role !== 'parent' || roleObj.debug !== true) {
    badge.style.display = 'none';
    return;
  }

  const on = localStorage.getItem('debugView') === '1';
  badge.style.display = 'block';
  badge.textContent = on ? 'parent / debugView ON' : 'parent / debugView off';

  // click to toggle because buttons are overrated
  badge.onclick = () => {
    localStorage.setItem('debugView', on ? '0' : '1');
    window.location.reload();
  };
}
// ---- Preview Child View Selector (parent debug) ----
async function setupPreviewChildSelector() {
  const sel = document.getElementById('preview-child-select');


  if (!sel) return;

  const role = await CQ_AUTH.getRole();
  if (role.role == 'parent' && CQ_AUTH.isParentDebugBypass(role)) {
    document.body.classList.toggle('debug-on', 1);

    //return;
  }

  const children = await loadChildren();
  sel.innerHTML = `<option value="">Preview Child View</option>`;

  children.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.childId;
    opt.textContent = c.name;
    sel.appendChild(opt);
  });

  sel.value = localStorage.getItem('previewChildId') || '';

  sel.onchange = () => {
    if (sel.value) {
      localStorage.setItem('previewChildId', sel.value);
      window.location.href = '../child/index.html';
    } else {
      localStorage.removeItem('previewChildId');
    }
  };
}

// ---- Parent device approval / children ----

async function loadPendingDevices() {
  return api('getPendingDevices.php', 'GET');
}

async function loadChildren() {
  // you have this endpoint in backend: getChildren.php
  return api('getChildren.php', 'GET');
}

async function assignPendingAsChild(targetDeviceId, childId = null, createNew = false, name = '') {
  return api('assignDevice.php', 'POST', {
    targetDeviceId,
    role: 'child',
    childId,
    createNew,
    name
  });
}

async function assignPendingAsParent(targetDeviceId) {
  return api('assignDevice.php', 'POST', {
    targetDeviceId,
    role: 'parent'
  });
}

async function swapChildDevices(deviceA, deviceB) {
  return api('swapDevices.php', 'POST', { deviceA, deviceB });
}

// ---- Parent Dashboard Rendering ----

function renderParentQuests(quests, childMap) {
  const list = document.querySelector('.quest-list');
  if (!list) return;

  list.innerHTML = '';
  quests.forEach(q => {
    const card = document.createElement('div');
    card.className = 'quest-card';

    const childName = childMap[q.childId] || q.childId || 'unknown child';

    card.innerHTML = `
      <h3>${escapeHtml(q.title)}</h3>
      <p>${escapeHtml(q.description || '')}</p>
      <p><strong>Reward:</strong> ${escapeHtml(q.reward || '')}</p>
      <p style="font-size:.9em;color:#666">
        <strong>Child:</strong> ${escapeHtml(childName)}<br>
        Status: <strong>${escapeHtml(q.status)}</strong>
        ${q.completedAt ? `• Completed: ${escapeHtml(formatTime(q.completedAt))}` : ''}
        ${q.approvedAt ? `• Approved: ${escapeHtml(formatTime(q.approvedAt))}` : ''}
      </p>

      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${q.status === STATUS.PENDING ? `<button data-approve="${escapeHtml(q.id)}">Approve</button>` : ''}
        <button data-delete="${escapeHtml(q.id)}">Delete</button>
      </div>
    `;

    list.appendChild(card);
  });

  // wire buttons
  list.querySelectorAll('[data-approve]').forEach(btn => {
    btn.onclick = async () => {
      const id = btn.getAttribute('data-approve');
      await api('approveQuest.php', 'POST', { id });
      await renderAll();
    };
  });

  list.querySelectorAll('[data-delete]').forEach(btn => {
    btn.onclick = async () => {
      const id = btn.getAttribute('data-delete');
      if (!confirm('Delete this quest?')) return;
      await api('deleteQuest.php', 'POST', { id });
      await renderAll();
    };
  });
}

async function setupAddQuestForm(children) {
  const form = document.getElementById('quest-form');
  if (!form) return;

  const childSelect = document.getElementById('child-select');
  if (childSelect) {
    childSelect.innerHTML = '';
    children.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.childId;
      opt.textContent = c.name || c.childId;
      childSelect.appendChild(opt);
    });
  }

  form.onsubmit = async (e) => {
    e.preventDefault();

    const title = document.getElementById('q-title')?.value?.trim() || '';
    const desc  = document.getElementById('q-desc')?.value?.trim() || '';
    const reward= document.getElementById('q-reward')?.value?.trim() || '';
    const childId = childSelect?.value || '';

    if (!title || !childId) {
      alert('Need title + child.');
      return;
    }

    await api('addQuest.php', 'POST', { title, description: desc, reward, childId });
    form.reset();
    await renderAll();
  };

  const aiBtn = document.getElementById('aiSuggest');
  if (aiBtn) {
    aiBtn.onclick = async () => {
      const childId = childSelect?.value || '';
      if (!childId) return alert('Pick a child first.');

      // no real ai. just vibes. (easy to swap with real ai later)
      const ideas = [
        { title: 'Clean your desk', description: 'Remove clutter, wipe it down.', reward: '10 coins' },
        { title: 'Do homework 30 min', description: 'Timer on. No phone.', reward: '15 coins' },
        { title: 'Help with dishes', description: 'Wash or dry, your choice.', reward: '12 coins' },
        { title: 'Read 10 pages', description: 'Any book counts.', reward: '8 coins' }
      ];

      const pick = () => ideas[Math.floor(Math.random() * ideas.length)];
      const a = pick(), b = pick();

      if (!confirm(`Add suggestions?\n- ${a.title}\n- ${b.title}`)) return;

      await api('addQuest.php', 'POST', { ...a, childId });
      await api('addQuest.php', 'POST', { ...b, childId });

      await renderAll();
    };
  }
}

// ---- Parent Home Rendering (pending + quick tools) ----

async function renderPendingSection() {
  const box = document.getElementById('pending-list');
  if (!box) return;

  const pending = await loadPendingDevices();
  if (!Array.isArray(pending) || pending.length === 0) {
    box.innerHTML = `<p style="color:#666">No pending devices.</p>`;
    return;
  }

  // show pending devices with action buttons
  box.innerHTML = '';
  pending.forEach(p => {
    const row = document.createElement('div');
    row.className = 'quest-card';
    row.innerHTML = `
      <h3>${escapeHtml(p.name || 'Unnamed')}</h3>
      <p style="font-size:.9em;color:#666">Device: <code>${escapeHtml(p.deviceId)}</code></p>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button data-mkparent="${escapeHtml(p.deviceId)}">Make Parent</button>
        <button data-mkchild="${escapeHtml(p.deviceId)}">Make New Child</button>
        <button data-attach="${escapeHtml(p.deviceId)}">Attach To Existing Child</button>
      </div>
    `;
    box.appendChild(row);
  });

  // events
  box.querySelectorAll('[data-mkparent]').forEach(btn => {
    btn.onclick = async () => {
      const dev = btn.getAttribute('data-mkparent');
      await assignPendingAsParent(dev);
      await renderPendingSection();
    };
  });

  box.querySelectorAll('[data-mkchild]').forEach(btn => {
    btn.onclick = async () => {
      const dev = btn.getAttribute('data-mkchild');
      await assignPendingAsChild(dev, null, true, ''); // create new child using pending name
      await renderPendingSection();
    };
  });

  box.querySelectorAll('[data-attach]').forEach(btn => {
    btn.onclick = async () => {
      const dev = btn.getAttribute('data-attach');
      const children = await loadChildren();
      if (!children.length) return alert('No children exist yet. Make new child first.');

      // quick and dirty chooser. html dropdown UI comes in next step.
      const options = children.map((c, i) => `${i + 1}) ${c.name} (${c.childId})`).join('\n');
      const pick = prompt(`Pick a child number:\n${options}`);
      const idx = parseInt(pick || '', 10) - 1;
      if (Number.isNaN(idx) || idx < 0 || idx >= children.length) return;

      await assignPendingAsChild(dev, children[idx].childId, false, '');
      await renderPendingSection();
    };
  });
}

async function renderSwapSection() {
  const box = document.getElementById('swap-tools');
  if (!box) return;

  // simple: parent pastes two deviceIds and swaps them (child devices only)
  const btn = document.getElementById('swap-btn');
  if (!btn) return;

  btn.onclick = async () => {
    const a = document.getElementById('swap-a')?.value?.trim() || '';
    const b = document.getElementById('swap-b')?.value?.trim() || '';
    if (!a || !b) return alert('Need two device IDs.');

    await swapChildDevices(a, b);
    alert('Swapped. (quests stay with childId, as planned)');
  };
}

// ---- Child Rendering ----

function renderChildQuests(quests) {
  const list = document.querySelector('.quest-list');
  if (!list) return;

  list.innerHTML = '';

  quests.forEach(q => {
    const card = document.createElement('div');
    card.className = 'quest-card';

    let actionHtml = '';
    if (q.status === STATUS.ACTIVE) {
      actionHtml = `<button data-done="${escapeHtml(q.id)}">Mark as Done</button>`;
    } else if (q.status === STATUS.PENDING) {
      actionHtml = `<p style="color:#b26b00"><strong>Pending approval</strong></p>`;
    } else {
      actionHtml = `<p style="color:#0a7d2c"><strong>Approved ✅</strong></p>`;
    }

    card.innerHTML = `
      <h3>${escapeHtml(q.title)}</h3>
      <p>${escapeHtml(q.description || '')}</p>
      <p><strong>Reward:</strong> ${escapeHtml(q.reward || '')}</p>
      ${actionHtml}
    `;

    list.appendChild(card);
  });

  list.querySelectorAll('[data-done]').forEach(btn => {
    btn.onclick = async () => {
      const id = btn.getAttribute('data-done');
      if (!confirm('Mark this quest as done?')) return;
      await api('markDone.php', 'POST', { id });
      await renderAll();
    };
  });
}
// ---- Child name display ----
async function renderChildName() {
  const title = document.getElementById('child-name-title');
  if (!title) return;

  const role = await CQ_AUTH.getRole();
  if (role.role !== 'child') return;

  if (role.name) {
    title.textContent = `${role.name}'s Quests`;
  }
}

// ---- Waiting Page ----

async function initWaiting() {
  const nameInput = document.getElementById('wait-name');
  const sendBtn = document.getElementById('wait-send');
  const status = document.getElementById('wait-status');

  // if backend already knows our pending name, show it (nice UX)
  const role = await window.CQ_AUTH.fetchRoleFresh();
  if (role.pendingName && nameInput) nameInput.value = role.pendingName;

  sendBtn.onclick = async () => {
    const name = nameInput.value.trim();
    if (!name) return alert('Type your name.');

    await api('requestDevice.php', 'POST', { name });
    status.textContent = 'Request sent. Now we wait.';

    // poll for approval
    const tick = async () => {
      const r = await window.CQ_AUTH.fetchRoleFresh();
      if (r.role === 'child') window.location.replace('./child/index.html');
      if (r.role === 'parent') window.location.replace('./parent/index.html');
    };
    await tick();
    setInterval(tick, 5000);
  };
}
// ---- Dummy children (dev helper) ----
// safe to delete later, no backend changes needed

async function createDummyKids() {
  const names = ['Ali', 'Ameer', 'Dawood'];

  for (const name of names) {
    // fake device id so backend treats them as separate devices
    const fakeDevice = `dummy_${name.toLowerCase()}_${Date.now()}`;

    // create pending request
    await api('requestDevice.php', 'POST', {
      deviceId: fakeDevice,
      name
    });

    // immediately approve as new child
    await api('assignDevice.php', 'POST', {
      targetDeviceId: fakeDevice,
      role: 'child',
      createNew: true,
      name
    });
  }

  alert('Dummy kids created.');
  await renderAll();
}


// ---- Main render switch ----

async function renderAll() {
  const page = document.body.dataset.page || '';

  // role enforcement is handled in each HTML page, but rendering still depends on page type
  const quests = await loadQuests();

  // stats can show on many pages if element exists
  renderStats(quests);
  await renderDebugBadge();

  if (page === 'parent-dashboard') {
    const children = await loadChildren();
    const childMap = {};
    children.forEach(c => childMap[c.childId] = c.name);
    await setupPreviewChildSelector();
    await renderParentQuests(quests, childMap);
    await setupAddQuestForm(children);

    return;
  }

  if (page === 'parent-home') {
    // parent home tools
    await renderPendingSection();
    await setupPreviewChildSelector();
    await renderSwapSection();
    return;
  }

  if (page === 'child') {
    await renderChildName();
    renderChildQuests(quests);

    return;
  }

  if (page === 'waiting') {
    await initWaiting();
    return;
  }

  if (page === 'root-index') {
    // if registered, route away immediately
    await window.CQ_AUTH.routeFromRoot();

    // root setup buttons for unregistered
    const btnWait = document.getElementById('go-wait');
    if (btnWait) btnWait.onclick = () => window.location.replace('./waiting.html');

  }
}

document.addEventListener('DOMContentLoaded', () => {
  // if auth isn't loaded, we're doomed, so let's be dramatic about it
  if (!window.CQ_AUTH) {
    console.error('auth.js missing. everything will break.');
    return;
  }

  renderAll().catch(err => {
    console.error(err);
    const el = document.getElementById('fatal');
    if (el) el.textContent = String(err);
  });
});
