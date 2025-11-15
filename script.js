const API_BASE = './backend';
// this is basically me being lazy. now i only type "backend" once instead of 23131435124523413513242134 times.
// truly peak programmer efficiency right here.


// tiny wrapper around fetch() so i don't lose my sanity , spoiler i still lost it
async function api(path, method = 'GET', body = null) {
    const opts = { method, headers: {} };
    // this "opts" object tells fetch what to do
    // fetch( url , options ) — this is the "options"

    if (body) {
        // if we have a body, we are POSTing something
        // aka "sending data to the php goblin"
        opts.headers['Content-Type'] = 'application/json';
        opts.body = JSON.stringify(body);
        // js → json → php receives it → does magic → returns json back
    }

    const res = await fetch(`${API_BASE}/${path}`, opts);
    // sending request to: backend/someFile.php

    return res.json();
    // we always expect json back because it's cleaner than my room, not kidding
}


// fetches quests from backend AND double-checks it's an array because php likes chaos, or so i've read on stack overflow
async function loadQuests() {
    const data = await api('getQuests.php');
    // calling our api helper, grabbing whatever php returns

    return Array.isArray(data) ? data : data.quests || [];
    // defensive coding: if data isn't an array (bc php is "quirky"),
    // we default to data.quests or empty array
}


// this function figures out which page we’re on and draws the right stuff
async function renderAll() {
    const page = document.body.dataset.page;
    // inside each html file, you set <body data-page="parent"> etc.
    // this tells JS "where the heck are we?", keeping it pg 13 you are welcome

    const quests = await loadQuests();
    // pull fresh quests from backend

    if (page === 'parent') renderParent(quests);
    if (page === 'child') renderChild(quests);
    if (page === 'index') renderIndexStats(quests);

    // stats appear everywhere because analytics are watching you, you reached this course i assume you passed "probabilities and statistics" sry for the ptsd
    renderStats(quests);
}


// shows stats under the home hero section (homepage only)
function renderIndexStats(quests) {
    const stats = computeStats(quests);

    const container = document.querySelector('.hero .buttons') || document.body;

    let el = document.getElementById('home-stats');
    if (!el) {
        // oh no element missing? no problem. we summon it.
        el = document.createElement('div');
        el.id = 'home-stats';
        el.style.marginTop = '20px';
        container.parentNode.insertBefore(el, container.nextSibling);
    }

    // shove stats into HTML
    el.innerHTML = `
    <strong>Quests total:</strong> ${stats.total} —
    <strong>Active:</strong> ${stats.active} —
    <strong>Pending approval:</strong> ${stats.pending} —
    <strong>Approved:</strong> ${stats.approved}
  `;
}

// keeps our html safe from kids doing "<script>alert(1)</script>" tricks
function escapeHtml(str = '') {
    if (!str) return '';
    return str.replace(/[&<>"']/g, (m) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[m]);
}


// formats timestamp into something we humans can read
function formatTime(ts) {
    if (!ts) return '-';
    const d = new Date(ts * 1000); // backend stores unix timestamps
    return d.toLocaleString(); // browser magically makes it pretty
}

//parent ui
function renderParent(quests) {
    const list = document.querySelector('.quest-list');
    list.innerHTML = '';// wipes old
    quests.forEach(q => {
        const card = document.createElement('div');
        card.className = 'quest-card';
        card.innerHTML = `
      <h3>${escapeHtml(q.title)}</h3>
      <p>${escapeHtml(q.description)}</p>
      <p><strong>Reward:</strong> ${escapeHtml(q.reward)}</p>
      <p style="font-size:.9em;color:#666">Status: <strong>${q.status}</strong> ${
            q.completedAt ? `• Completed: ${formatTime(q.completedAt)}` : ''
        } ${q.approvedAt ? `• Approved: ${formatTime(q.approvedAt)}` : ''}</p>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        ${q.status === 'pendingApproval' ? `<button onclick="parentApprove('${q.id}')">Approve</button>` : ''}
        <button onclick="deleteQuest('${q.id}')">Delete</button>
      </div>
    `;
        list.appendChild(card);
    });
    // hook form
    const addBtn = document.querySelector('.quest-form button');
    if (addBtn) {
        addBtn.onclick = addQuestFromForm;
    }
    const aiBtn = document.getElementById('aiSuggest');
    if (aiBtn) aiBtn.onclick = aiSuggest;
}

// child ui
function renderChild(quests) {
    const list = document.querySelector('.quest-list');
    list.innerHTML = '';
    quests
        .filter(q => q.assignedTo === 'child')
        .forEach(q => {
            const card = document.createElement('div');
            card.className = 'quest-card' + (q.status === 'approved' ? ' completed' : '');
            card.innerHTML = `
        <h3>${escapeHtml(q.title)}</h3>
        <p>${escapeHtml(q.description)}</p>
        <p><strong>Reward:</strong> ${escapeHtml(q.reward)}</p>
        <p style="font-size:.9em;color:#666">Status: <strong>${q.status}</strong></p>
        <div style="display:flex;gap:8px">
          ${q.status === 'active' ? `<button onclick="childMarkDone('${q.id}')">Mark as Done</button>` : ''}
          ${q.status === 'pendingApproval' ? `<button disabled>Pending approval</button>` : ''}
          ${q.status === 'approved' ? `<button disabled>✅ Reward granted</button>` : ''}
        </div>
      `;
            list.appendChild(card);
        });



}

/* ---------- Actions ---------- */
async function addQuestFromForm() {
    const title = document.querySelector('.quest-form input[type="text"]').value.trim();
    const description = document.querySelector('.quest-form textarea').value.trim();
    const reward = document.querySelectorAll('.quest-form input[type="text"]')[1].value.trim();
    if (!title) return alert('Please add a title');
    const payload = {title, description, reward, assignedTo: 'child'};
    await api('addQuest.php', 'POST', payload);
    // clear
    document.querySelector('.quest-form').reset();
    renderAll();
}
async function childMarkDone(id) {
    if (!confirm('Mark this quest as done and request approval?')) return;
    await api('markDone.php', 'POST', {id});
    renderAll();
}

async function parentApprove(id) {
    if (!confirm('Approve and grant reward to child?')) return;
    await api('approveQuest.php', 'POST', {id});
    renderAll();
}

async function deleteQuest(id) {
    if (!confirm('Delete this quest?')) return;
    await api('deleteQuest.php', 'POST', {id});
    renderAll();
}
//🥲🥲🥲🥲🥲😫😫😫stats😫😫😫🥲🥲🥲🥲🥲
function computeStats(quests) {
    const total = quests.length;
    const active = quests.filter(q => q.status === 'active').length;
    const pending = quests.filter(q => q.status === 'pendingApproval').length;
    const approved = quests.filter(q => q.status === 'approved').length;
    const completionRate = total ? Math.round((approved / total) * 100) : 0;
    return {total, active, pending, approved, completionRate};
}

function renderStats(quests) {
    const el = document.getElementById('site-stats');
    const stats = computeStats(quests);
    if (!el) return;
    el.innerHTML = `
    <div><strong>Total:</strong> ${stats.total}</div>
    <div><strong>Active:</strong> ${stats.active}</div>
    <div><strong>Pending approval:</strong> ${stats.pending}</div>
    <div><strong>Approved:</strong> ${stats.approved}</div>
    <div><strong>Completion rate:</strong> ${stats.completionRate}%</div>
    <canvas id="statsChart" width="300" height="120"></canvas> 
`;


    drawChart(stats);
}

function drawChart(stats) {
    const canvas = document.getElementById('statsChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const values = [stats.active, stats.pending, stats.approved];
    const labels = ['Active', 'Pending', 'Approved'];
    const max = Math.max(...values, 1);
    const barW = 60;
    values.forEach((v, i) => {
        const h = (v / max) * 80 + 10;
        ctx.fillStyle = '#6d5bd6';
        ctx.fillRect(30 + i * (barW + 20), canvas.height - h - 20, barW, h);
        ctx.fillStyle = '#222';
        ctx.font = '12px sans-serif';
        ctx.fillText(labels[i], 30 + i * (barW + 20), canvas.height - 2);
        ctx.fillText(v, 30 + i * (barW + 20) + barW / 2 - 6, canvas.height - h - 25);
    });
}

// super agent still this ai will someday take over the world muah hah ha hah
function aiSuggest() {
    const templates = [
        {title: 'Tidy the play area', desc: 'Pick up toys and put them in their boxes.', reward: '1 gold star'},
        {title: 'Laundry Legend', desc: 'Fold and put away all clean clothes.', reward: '20 minutes screen time'},
        {title: 'Dish Defender', desc: 'Wash all dishes after dinner.', reward: '1 gold star'},
        {title: 'Floor Patrol', desc: 'Sweep or vacuum main room.', reward: '10 minutes video'},
        {title: 'Plant Protector', desc: 'Water the indoor plants carefully.', reward: '5 minutes extra play'}
    ];
    // pick 2
    const pick = [];
    while (pick.length < 2) {
        const p = templates[Math.floor(Math.random() * templates.length)];
        if (!pick.find(x => x.title === p.title)) pick.push(p);
    }
    // show
    const msg = pick.map((p, i) => `${i + 1}. ${p.title} — ${p.reward}\n   ${p.desc}`).join('\n\n');
    if (confirm(`AI suggests:\n\n${msg}\n\nPress OK to auto-add these to quests.`)) {
        // add them
        (async () => {
            for (const s of pick) {
                await api('addQuest.php', 'POST', {
                    title: s.title,
                    description: s.desc,
                    reward: s.reward,
                    assignedTo: 'child'
                });
            }
            await renderAll();
            alert('Suggested quests added.');
        })();
    }
}

//init
document.addEventListener('DOMContentLoaded', () => {
    // insert a stats area in header/footer
    const footer = document.querySelector('footer');
    if (footer) {
        const statsBox = document.createElement('div');
        statsBox.id = 'site-stats';
        statsBox.style.padding = '12px';
        statsBox.style.maxWidth = '800px';
        statsBox.style.margin = '10px auto';
        footer.parentNode.insertBefore(statsBox, footer);
    }
    renderAll();
});