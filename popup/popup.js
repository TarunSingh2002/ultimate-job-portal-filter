// ── Tab Switching ─────────────────────────────────────────────

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
    btn.classList.add('active');
    document.getElementById(`tab-${btn.dataset.tab}`).classList.remove('hidden');
  });
});

// ── Helpers ───────────────────────────────────────────────────

function showSavedTick() {
  const status = document.createElement('div');
  status.textContent = '✔';
  status.className = 'save-status';
  document.body.appendChild(status);
  setTimeout(() => window.close(), 1000);
}

function parseTextarea(id) {
  return document.getElementById(id).value
    .split(',')
    .map(k => k.trim())
    .filter(k => k);
}

// ── Seen Promoted List UI ─────────────────────────────────────

/**
 * Show/hide the seen-list section based on the selected radio,
 * and render the current list entries from chrome.storage.local.
 */
function updateSeenPromotedUI() {
  const mode    = document.querySelector('input[name="promotedMode"]:checked')?.value;
  const section = document.getElementById('seenPromotedSection');

  if (mode !== 'partial') {
    section.classList.add('hidden');
    return;
  }
  section.classList.remove('hidden');

  const today = new Date().toISOString().slice(0, 10);
  chrome.storage.local.get(['seen_promoted_list'], (data) => {
    const stored = data['seen_promoted_list'];
    const list   = (stored && stored.date === today) ? (stored.list || []) : [];
    const listEl = document.getElementById('seenPromotedList');

    if (!list.length) {
      listEl.textContent = 'No promoted jobs seen yet today.';
    } else {
      listEl.innerHTML = list.map(key => {
        const [title, company] = key.split('|');
        return `<div class="seen-item">• <strong>${title}</strong> @ ${company || ''}</div>`;
      }).join('');
    }
  });
}

// Show/hide seen section whenever the radio selection changes
document.querySelectorAll('input[name="promotedMode"]').forEach(r => {
  r.addEventListener('change', updateSeenPromotedUI);
});

// Clear seen list button in popup
document.getElementById('clearSeenPromoted').addEventListener('click', () => {
  chrome.storage.local.remove('seen_promoted_list', () => {
    updateSeenPromotedUI();
  });
});

// ── LinkedIn Save ─────────────────────────────────────────────

document.getElementById('saveLinkedIn').addEventListener('click', () => {
  const whitelistKeywords = parseTextarea('whitelistKeywords');
  const titleKeywords     = parseTextarea('titleKeywords');
  const companyNames      = parseTextarea('companyNames');
  const hideApplied       = document.getElementById('hideApplied').checked;
  const hideDismissed     = document.getElementById('hideDismissed').checked;
  const promotedMode      = document.querySelector('input[name="promotedMode"]:checked')?.value || 'show';

  chrome.storage.sync.set({
    whitelistKeywords,
    titleKeywords,
    companyNames,
    hideApplied,
    hideDismissed,
    promotedMode
  }, showSavedTick);
});

// ── Naukri Save ───────────────────────────────────────────────

document.getElementById('saveNaukri').addEventListener('click', () => {
  const naukri_blacklistedKeywords  = parseTextarea('naukri_blacklistedKeywords');
  const naukri_blacklistedCompanies = parseTextarea('naukri_blacklistedCompanies');
  const naukri_hideSaved            = document.getElementById('naukri_hideSaved').checked;
  const naukri_hidePromoted         = document.getElementById('naukri_hidePromoted').checked;

  chrome.storage.sync.set({
    naukri_blacklistedKeywords,
    naukri_blacklistedCompanies,
    naukri_hideSaved,
    naukri_hidePromoted
  }, showSavedTick);
});

// ── Load Saved Settings on Popup Open ────────────────────────

// LinkedIn
chrome.storage.sync.get(
  ['whitelistKeywords', 'titleKeywords', 'companyNames',
   'hideApplied', 'hidePromoted', 'hideDismissed',
   'partialHidePromoted', 'promotedMode'],
  (data) => {
    document.getElementById('whitelistKeywords').value = data.whitelistKeywords?.join(', ') || '';
    document.getElementById('titleKeywords').value     = data.titleKeywords?.join(', ')     || '';
    document.getElementById('companyNames').value      = data.companyNames?.join(', ')      || '';
    document.getElementById('hideApplied').checked     = data.hideApplied    || false;
    document.getElementById('hideDismissed').checked   = data.hideDismissed  || false;

    // Backward compat: if user had old boolean settings, map them to the radio value
    const mode = data.promotedMode ||
      (data.hidePromoted ? 'hide' : (data.partialHidePromoted ? 'partial' : 'show'));
    const radio = document.querySelector(`input[name="promotedMode"][value="${mode}"]`);
    if (radio) radio.checked = true;

    updateSeenPromotedUI(); // render seen list or hide section
  }
);

// Naukri
chrome.storage.sync.get(
  ['naukri_blacklistedKeywords', 'naukri_blacklistedCompanies', 'naukri_hideSaved', 'naukri_hidePromoted'],
  (data) => {
    document.getElementById('naukri_blacklistedKeywords').value  = data.naukri_blacklistedKeywords?.join(', ')  || '';
    document.getElementById('naukri_blacklistedCompanies').value = data.naukri_blacklistedCompanies?.join(', ') || '';
    document.getElementById('naukri_hideSaved').checked          = data.naukri_hideSaved    || false;
    document.getElementById('naukri_hidePromoted').checked       = data.naukri_hidePromoted || false;
  }
);

// ── Indeed Save ───────────────────────────────────────────────

document.getElementById('saveIndeed').addEventListener('click', () => {
  const indeed_blacklistedKeywords  = parseTextarea('indeed_blacklistedKeywords');
  const indeed_blacklistedCompanies = parseTextarea('indeed_blacklistedCompanies');
  const indeed_hideSaved            = document.getElementById('indeed_hideSaved').checked;

  chrome.storage.sync.set({
    indeed_blacklistedKeywords,
    indeed_blacklistedCompanies,
    indeed_hideSaved
  }, showSavedTick);
});

chrome.storage.sync.get(
  ['indeed_blacklistedKeywords', 'indeed_blacklistedCompanies', 'indeed_hideSaved'],
  (data) => {
    document.getElementById('indeed_blacklistedKeywords').value  = data.indeed_blacklistedKeywords?.join(', ')  || '';
    document.getElementById('indeed_blacklistedCompanies').value = data.indeed_blacklistedCompanies?.join(', ') || '';
    document.getElementById('indeed_hideSaved').checked          = data.indeed_hideSaved || false;
  }
);

// ── Glassdoor Save ────────────────────────────────────────────

document.getElementById('saveGlassdoor').addEventListener('click', () => {
  const glassdoor_blacklistedKeywords  = parseTextarea('glassdoor_blacklistedKeywords');
  const glassdoor_blacklistedCompanies = parseTextarea('glassdoor_blacklistedCompanies');
  const glassdoor_hideSaved            = document.getElementById('glassdoor_hideSaved').checked;

  chrome.storage.sync.set({
    glassdoor_blacklistedKeywords,
    glassdoor_blacklistedCompanies,
    glassdoor_hideSaved
  }, showSavedTick);
});

chrome.storage.sync.get(
  ['glassdoor_blacklistedKeywords', 'glassdoor_blacklistedCompanies', 'glassdoor_hideSaved'],
  (data) => {
    document.getElementById('glassdoor_blacklistedKeywords').value  = data.glassdoor_blacklistedKeywords?.join(', ')  || '';
    document.getElementById('glassdoor_blacklistedCompanies').value = data.glassdoor_blacklistedCompanies?.join(', ') || '';
    document.getElementById('glassdoor_hideSaved').checked          = data.glassdoor_hideSaved || false;
  }
);

// ── Foundit Save ──────────────────────────────────────────────

document.getElementById('saveFoundit').addEventListener('click', () => {
  const foundit_blacklistedKeywords  = parseTextarea('foundit_blacklistedKeywords');
  const foundit_blacklistedCompanies = parseTextarea('foundit_blacklistedCompanies');
  const foundit_hideSaved            = document.getElementById('foundit_hideSaved').checked;

  chrome.storage.sync.set({
    foundit_blacklistedKeywords,
    foundit_blacklistedCompanies,
    foundit_hideSaved
  }, showSavedTick);
});

chrome.storage.sync.get(
  ['foundit_blacklistedKeywords', 'foundit_blacklistedCompanies', 'foundit_hideSaved'],
  (data) => {
    document.getElementById('foundit_blacklistedKeywords').value  = data.foundit_blacklistedKeywords?.join(', ')  || '';
    document.getElementById('foundit_blacklistedCompanies').value = data.foundit_blacklistedCompanies?.join(', ') || '';
    document.getElementById('foundit_hideSaved').checked          = data.foundit_hideSaved || false;
  }
);