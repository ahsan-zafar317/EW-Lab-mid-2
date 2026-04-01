// ─── TIER SYSTEM ────────────────────────────────────────────────────────────
const TIERS = {
  free:  { label: 'FREE',  color: '#64748b', bg: 'rgba(100,116,139,0.12)', price: '$0',  name: 'Basic',  index: 0 },
  pro:   { label: 'PRO',   color: '#22c55e', bg: 'rgba(34,197,94,0.12)',   price: '$9',  name: 'Flow',   index: 1 },
  elite: { label: 'ELITE', color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', price: '$19', name: 'Deep',   index: 2 },
  apex:  { label: 'APEX',  color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  price: '$39', name: 'Apex',   index: 3 },
};

const TIER_ORDER = ['free', 'pro', 'elite', 'apex'];

function getCurrentTier() {
  return localStorage.getItem('focusai_tier') || 'free';
}

function setTier(tier) {
  localStorage.setItem('focusai_tier', tier);
  updateNavBadge();
  if (typeof onTierChange === 'function') onTierChange(tier);
}

function hasTier(required) {
  const current = getCurrentTier();
  return TIER_ORDER.indexOf(current) >= TIER_ORDER.indexOf(required);
}

function updateNavBadge() {
  const badge = document.getElementById('navTierBadge');
  if (!badge) return;
  const tier = getCurrentTier();
  const t = TIERS[tier];
  badge.textContent = t.label;
  badge.style.background = t.bg;
  badge.style.color = t.color;
}

// ─── MODAL LOGIC ─────────────────────────────────────────────────────────────
let selectedModalTier = getCurrentTier();

function openUpgradeModal(tier) {
  selectedModalTier = tier || getCurrentTier();
  const modal = document.getElementById('upgradeModal');
  if (!modal) return;
  modal.classList.add('open');
  renderModalSelection();
}

function closeUpgradeModal() {
  const modal = document.getElementById('upgradeModal');
  if (modal) modal.classList.remove('open');
}

function selectModalTier(tier) {
  selectedModalTier = tier;
  renderModalSelection();
}

function renderModalSelection() {
  Object.keys(TIERS).forEach(t => {
    const card = document.getElementById('mcard-' + t);
    if (!card) return;
    const isSelected = t === selectedModalTier;
    const info = TIERS[t];
    card.style.borderColor = isSelected ? info.color : '';
    card.style.borderWidth = isSelected ? '2px' : '1px';
    card.style.boxShadow = isSelected ? `0 0 24px ${info.bg}` : '';
  });

  const label = document.getElementById('selectedTierLabel');
  if (label) {
    const info = TIERS[selectedModalTier];
    label.textContent = `→ ${info.name} · ${info.price}/mo`;
    label.style.color = info.color;
  }

  const btn = document.getElementById('confirmUpgradeBtn');
  if (btn) {
    if (selectedModalTier === 'free') {
      btn.textContent = 'Use Free Plan';
    } else {
      btn.textContent = `Upgrade to ${TIERS[selectedModalTier].name} →`;
    }
  }
}

function confirmUpgrade() {
  setTier(selectedModalTier);
  closeUpgradeModal();

  // Show toast
  showToast(`✓ Switched to ${TIERS[selectedModalTier].name} tier!`, TIERS[selectedModalTier].color);

  // If on dashboard, refresh
  if (typeof refreshDashboard === 'function') refreshDashboard();
}

// ─── TOAST ────────────────────────────────────────────────────────────────────
function showToast(msg, color) {
  let toast = document.getElementById('focusToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'focusToast';
    toast.style.cssText = `
      position:fixed; bottom:28px; left:50%; transform:translateX(-50%) translateY(80px);
      background:#0c0c14; border:1px solid rgba(255,255,255,0.1); border-radius:12px;
      padding:14px 24px; font-family:'Space Grotesk',sans-serif; font-size:0.9rem;
      font-weight:600; z-index:9999; transition:transform 0.3s, opacity 0.3s;
      opacity:0; white-space:nowrap; box-shadow:0 20px 60px rgba(0,0,0,0.5);
    `;
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.color = color || '#22c55e';
  toast.style.borderColor = color || '#22c55e';
  setTimeout(() => { toast.style.transform = 'translateX(-50%) translateY(0)'; toast.style.opacity = '1'; }, 10);
  setTimeout(() => { toast.style.transform = 'translateX(-50%) translateY(80px)'; toast.style.opacity = '0'; }, 3000);
}

// Close modal on overlay click
document.addEventListener('click', (e) => {
  const modal = document.getElementById('upgradeModal');
  if (modal && e.target === modal) closeUpgradeModal();
});
