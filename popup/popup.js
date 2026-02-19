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

// ── LinkedIn Save ─────────────────────────────────────────────

document.getElementById('saveLinkedIn').addEventListener('click', () => {
  const whitelistKeywords = parseTextarea('whitelistKeywords');
  const titleKeywords     = parseTextarea('titleKeywords');
  const companyNames      = parseTextarea('companyNames');
  const hideApplied       = document.getElementById('hideApplied').checked;
  const hidePromoted      = document.getElementById('hidePromoted').checked;
  const hideDismissed     = document.getElementById('hideDismissed').checked;

  chrome.storage.sync.set({
    whitelistKeywords,
    titleKeywords,
    companyNames,
    hideApplied,
    hidePromoted,
    hideDismissed
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
  ['whitelistKeywords', 'titleKeywords', 'companyNames', 'hideApplied', 'hidePromoted', 'hideDismissed'],
  (data) => {
    document.getElementById('whitelistKeywords').value = data.whitelistKeywords?.join(', ') || '';
    document.getElementById('titleKeywords').value     = data.titleKeywords?.join(', ')     || '';
    document.getElementById('companyNames').value      = data.companyNames?.join(', ')      || '';
    document.getElementById('hideApplied').checked     = data.hideApplied    || false;
    document.getElementById('hidePromoted').checked    = data.hidePromoted   || false;
    document.getElementById('hideDismissed').checked   = data.hideDismissed  || false;
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

// Indeed load on popup open
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

// Glassdoor load on popup open
chrome.storage.sync.get(
  ['glassdoor_blacklistedKeywords', 'glassdoor_blacklistedCompanies', 'glassdoor_hideSaved'],
  (data) => {
    document.getElementById('glassdoor_blacklistedKeywords').value  = data.glassdoor_blacklistedKeywords?.join(', ')  || '';
    document.getElementById('glassdoor_blacklistedCompanies').value = data.glassdoor_blacklistedCompanies?.join(', ') || '';
    document.getElementById('glassdoor_hideSaved').checked          = data.glassdoor_hideSaved || false;
  }
);
