// ─── TIMER STATE ──────────────────────────────────────────────────────────────
let totalTime = 25 * 60;
let time = totalTime;
let interval = null;
let running = false;
let sessions = 0;
let focusTime = 0;
let streak = parseInt(localStorage.getItem('focusai_streak') || '3');

const PRESETS = {
  social:    ['Instagram', 'Twitter / X', 'TikTok', 'Facebook', 'Snapchat', 'Reddit'],
  news:      ['CNN', 'BBC News', 'Reddit', 'HackerNews', 'NYTimes'],
  gaming:    ['Steam', 'Discord', 'Twitch', 'Epic Games', 'Xbox App'],
  streaming: ['YouTube', 'Netflix', 'Spotify', 'Twitch', 'Disney+'],
  shopping:  ['Amazon', 'eBay', 'Etsy', 'Shopify', 'AliExpress'],
};

// ─── TIMER ────────────────────────────────────────────────────────────────────
function startTimer() {
  if (running) return;
  running = true;
  document.getElementById('timer').className = 'timer-display running';
  document.getElementById('phaseDisplay').textContent = 'FOCUS';

  interval = setInterval(() => {
    if (time <= 0) { completeSession(); return; }
    time--;
    updateTimer();
  }, 1000);
}

function stopTimer() {
  if (!running) return;
  clearInterval(interval);
  running = false;
  document.getElementById('timer').className = 'timer-display stopped';

  const spent = Math.floor((totalTime - time) / 60);
  if (spent > 0) {
    sessions++;
    focusTime += spent;
    updateStats();
  }
}

function resetTimer() {
  clearInterval(interval);
  running = false;
  time = totalTime;
  document.getElementById('timer').className = 'timer-display';
  document.getElementById('phaseDisplay').textContent = 'FOCUS';
  updateTimer();
}

function completeSession() {
  clearInterval(interval);
  running = false;
  sessions++;
  focusTime += Math.floor(totalTime / 60);
  streak++;
  localStorage.setItem('focusai_streak', streak);
  updateStats();
  document.getElementById('timer').className = 'timer-display';
  time = totalTime;
  updateTimer();
  showToast('🚀 Session Complete! +' + Math.floor(totalTime/60) + ' mins', '#22c55e');
}

function updateTimer() {
  const m = Math.floor(time / 60);
  const s = time % 60;
  document.getElementById('timer').textContent = `${m}:${s < 10 ? '0' : ''}${s}`;
}

function setTimerMode(minutes, btn) {
  const tier = getCurrentTier();

  // 50 min needs Pro
  if (minutes === 50 && !hasTier('pro')) {
    openUpgradeModal('pro');
    return;
  }
  // 90 min needs Elite
  if (minutes === 90 && !hasTier('elite')) {
    openUpgradeModal('elite');
    return;
  }
  // Deep 120 min needs Apex
  if (minutes === 120 && !hasTier('apex')) {
    openUpgradeModal('apex');
    return;
  }

  totalTime = minutes * 60;
  time = totalTime;
  resetTimer();

  document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active-mode'));
  if (btn) btn.classList.add('active-mode');
}

// ─── APP BLOCKING ─────────────────────────────────────────────────────────────
let blockedApps = JSON.parse(localStorage.getItem('focusai_blocked') || '[]');

function saveApps() {
  localStorage.setItem('focusai_blocked', JSON.stringify(blockedApps));
}

function renderAppList() {
  const list = document.getElementById('appList');
  if (!list) return;
  list.innerHTML = '';
  blockedApps.forEach((app, i) => {
    const li = document.createElement('li');
    li.className = 'blocked-app-item';
    li.innerHTML = `<span>🚫 ${app}</span><button onclick="removeApp(${i})">✕</button>`;
    list.appendChild(li);
  });
}

function addApp() {
  const input = document.getElementById('appInput');
  const val = input.value.trim();
  if (!val) return;

  const tier = getCurrentTier();
  const limit = tier === 'free' ? 3 : 999;

  if (blockedApps.length >= limit) {
    showToast(`⚡ Upgrade to Pro for unlimited blocking`, '#22c55e');
    openUpgradeModal('pro');
    return;
  }

  if (blockedApps.includes(val)) {
    showToast('Already blocked!', '#64748b');
    return;
  }

  blockedApps.push(val);
  saveApps();
  renderAppList();
  updateFreeLimit();
  input.value = '';
}

function removeApp(i) {
  blockedApps.splice(i, 1);
  saveApps();
  renderAppList();
  updateFreeLimit();
}

function addPreset(pack) {
  if (!hasTier('pro')) {
    openUpgradeModal('pro');
    return;
  }
  const apps = PRESETS[pack] || [];
  let added = 0;
  apps.forEach(app => {
    if (!blockedApps.includes(app)) {
      blockedApps.push(app);
      added++;
    }
  });
  saveApps();
  renderAppList();
  if (added > 0) showToast(`✓ ${added} apps blocked from ${pack} pack`, '#22c55e');
  else showToast('Already blocked!', '#64748b');
}

function updateFreeLimit() {
  const el = document.getElementById('freeLimit');
  if (!el) return;
  const tier = getCurrentTier();
  if (tier === 'free') {
    const rem = Math.max(0, 3 - blockedApps.length);
    el.textContent = rem > 0 ? `${rem} slot${rem !== 1 ? 's' : ''} remaining (Free plan)` : '⚡ Limit reached — upgrade for unlimited';
    el.style.color = rem === 0 ? '#f59e0b' : 'var(--muted)';
  } else {
    el.textContent = `${blockedApps.length} app${blockedApps.length !== 1 ? 's' : ''} blocked`;
    el.style.color = 'var(--muted)';
  }
}

// ─── STATS ────────────────────────────────────────────────────────────────────
function updateStats() {
  const s = document.getElementById('sessions');
  const f = document.getElementById('focusTime');
  if (s) s.textContent = sessions;
  if (f) f.textContent = focusTime;

  const pct = Math.min((focusTime / 120) * 100, 100);
  const bar = document.getElementById('progressBar');
  if (bar) bar.style.width = pct + '%';

  const sc = document.getElementById('streakCount');
  if (sc) sc.textContent = streak + ' day streak';

  updateDistractionChart();
}

function updateDistractionChart() {
  const chart = document.getElementById('distractionChart');
  const note = document.getElementById('distractionNote');
  if (!chart) return;

  if (!hasTier('elite')) {
    chart.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;width:100%;gap:8px;color:var(--muted);font-size:0.78rem;">
      🔒 <span>Elite tier unlocks distraction patterns</span>
    </div>`;
    if (note) note.innerHTML = `<span onclick="openUpgradeModal('elite')" style="color:#a78bfa;cursor:pointer;">→ Upgrade to Elite</span>`;
    return;
  }

  const hours = ['9', '10', '11', '12', '1', '2', '3', '4', '5'];
  const data = hours.map(() => Math.floor(Math.random() * 80) + 10);
  chart.innerHTML = data.map((v, i) => `
    <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;">
      <div style="width:100%;background:linear-gradient(180deg,#a78bfa,#7c3aed);border-radius:3px 3px 0 0;height:${v}%;opacity:0.7;min-height:4px;"></div>
      <div style="font-size:0.55rem;color:var(--muted);font-family:'JetBrains Mono',monospace;">${hours[i]}</div>
    </div>
  `).join('');
  if (note) note.textContent = 'Peak distraction: 12–1 PM';
}

// ─── TIER REFRESH ─────────────────────────────────────────────────────────────
function refreshDashboard() {
  const tier = getCurrentTier();
  const TIERS = { free: 0, pro: 1, elite: 2, apex: 3 };
  const t = TIERS[tier];

  // Nav badge
  updateNavBadge();

  // Current tier badge
  const badge = document.getElementById('currentTierBadge');
  const labels = { free: 'FREE', pro: 'PRO', elite: 'ELITE', apex: 'APEX' };
  const colors = { free: ['rgba(100,116,139,0.15)','#64748b'], pro: ['rgba(34,197,94,0.15)','#22c55e'], elite: ['rgba(167,139,250,0.15)','#a78bfa'], apex: ['rgba(245,158,11,0.15)','#f59e0b'] };
  if (badge) {
    badge.textContent = labels[tier];
    badge.style.background = colors[tier][0];
    badge.style.color = colors[tier][1];
  }

  // Tier desc
  const descs = {
    free: 'Basic plan — 25-min sessions, 3 blocked apps',
    pro: 'Flow plan — custom sessions, unlimited blocking, streaks',
    elite: 'Deep plan — website blocking, deep mode, distraction reports',
    apex: 'Apex plan — full OS lockdown, AI predictions, biometric triggers',
  };
  const desc = document.getElementById('tierCapDesc');
  if (desc) desc.textContent = descs[tier];

  // Tier track dots
  const order = ['free', 'pro', 'elite', 'apex'];
  order.forEach((t2, i) => {
    const dot = document.getElementById('dot-' + t2);
    if (!dot) return;
    dot.className = 'tier-step-dot';
    if (i < TIERS[tier]) dot.classList.add('completed');
    else if (i === TIERS[tier]) dot.classList.add('current');
  });

  // Tier unlocks row
  const row = document.getElementById('tierUnlocksRow');
  if (row) {
    const unlocks = {
      free: [],
      pro: ['Custom timer', 'Unlimited blocking', 'Preset packs', 'Streaks'],
      elite: ['Website blocking', 'Deep mode', 'Distraction charts'],
      apex: ['OS lockdown', 'AI predictions', 'Biometric triggers'],
    };
    const color = colors[tier][1];
    row.innerHTML = unlocks[tier].map(u => `
      <span style="padding:3px 8px;border-radius:6px;font-size:0.68rem;font-family:'JetBrains Mono',monospace;font-weight:600;background:${colors[tier][0]};color:${color};">✓ ${u}</span>
    `).join('');
  }

  // Timer modes
  const mode50 = document.getElementById('mode50');
  const mode90 = document.getElementById('mode90');
  const modeDeep = document.getElementById('modeDeep');

  if (mode50) {
    const locked = !hasTier('pro');
    mode50.innerHTML = '50 min' + (locked ? ' <span class="lock-icon">🔒</span>' : '');
    mode50.classList.toggle('locked-mode', locked);
  }
  if (mode90) {
    const locked = !hasTier('elite');
    mode90.innerHTML = '90 min' + (locked ? ' <span class="lock-icon">🔒</span>' : '');
    mode90.classList.toggle('locked-mode', locked);
  }
  if (modeDeep) {
    const locked = !hasTier('apex');
    modeDeep.innerHTML = 'Deep ∞' + (locked ? ' <span class="lock-icon">🔒</span>' : '');
    modeDeep.classList.toggle('locked-mode', locked);
  }

  // Preset tags
  const allPresets = ['social','news','gaming','streaming','shopping'];
  allPresets.forEach(p => {
    const el = document.getElementById('preset-' + p);
    if (!el) return;
    const locked = !hasTier('pro');
    el.classList.toggle('locked', locked);
    el.title = locked ? 'Upgrade to Pro to use preset packs' : '';
  });

  const presetLock = document.getElementById('presetLockLabel');
  if (presetLock) presetLock.textContent = hasTier('pro') ? '' : '🔒 Pro+';

  // Web blocking toggle
  const webToggle = document.getElementById('webBlockToggle');
  if (webToggle) {
    if (hasTier('elite')) {
      webToggle.innerHTML = `<label style="position:relative;display:inline-block;width:36px;height:20px;cursor:pointer;">
        <input type="checkbox" id="webBlockCheck" style="opacity:0;width:0;height:0;" />
        <span style="position:absolute;inset:0;background:rgba(255,255,255,0.08);border-radius:20px;transition:0.2s;" id="webSlider"></span>
      </label>`;
      const check = document.getElementById('webBlockCheck');
      const slider = document.getElementById('webSlider');
      check.addEventListener('change', () => {
        slider.style.background = check.checked ? '#a78bfa' : 'rgba(255,255,255,0.08)';
        if (check.checked) showToast('🌐 Website blocking enabled', '#a78bfa');
      });
    } else {
      webToggle.innerHTML = `<span onclick="openUpgradeModal('elite')" style="font-size:0.7rem;color:#a78bfa;cursor:pointer;font-family:'JetBrains Mono',monospace;font-weight:700;">ELITE →</span>`;
    }
  }

  // OS lock toggle
  const osToggle = document.getElementById('osLockToggle');
  if (osToggle) {
    if (hasTier('apex')) {
      osToggle.innerHTML = `<label style="position:relative;display:inline-block;width:36px;height:20px;cursor:pointer;">
        <input type="checkbox" id="osLockCheck" style="opacity:0;width:0;height:0;" />
        <span style="position:absolute;inset:0;background:rgba(255,255,255,0.08);border-radius:20px;transition:0.2s;" id="osSlider"></span>
      </label>`;
      const check = document.getElementById('osLockCheck');
      const slider = document.getElementById('osSlider');
      check.addEventListener('change', () => {
        slider.style.background = check.checked ? '#f59e0b' : 'rgba(255,255,255,0.08)';
        if (check.checked) showToast('💻 OS Lockdown activated', '#f59e0b');
      });
    } else {
      osToggle.innerHTML = `<span onclick="openUpgradeModal('apex')" style="font-size:0.7rem;color:#f59e0b;cursor:pointer;font-family:'JetBrains Mono',monospace;font-weight:700;">APEX →</span>`;
    }
  }

  // Streak visibility
  const streakBox = document.getElementById('streakBox');
  if (streakBox) {
    streakBox.classList.toggle('locked', !hasTier('pro'));
    if (!hasTier('pro')) {
      streakBox.title = 'Upgrade to Pro for streak tracking';
      streakBox.onclick = () => openUpgradeModal('pro');
      streakBox.style.cursor = 'pointer';
    }
  }

  updateFreeLimit();
  renderAppList();
  updateStats();
}

// Hook tier change
function onTierChange(tier) {
  refreshDashboard();
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
updateTimer();
refreshDashboard();
