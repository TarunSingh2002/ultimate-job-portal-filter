// ============================================================
// Glassdoor.com Job Filter - Content Script
// Features:
//   - Hide saved jobs (+ hide on save-click in real time)
//   - Hide jobs by blacklisted company name (exact, case-insensitive)
//   - Hide jobs by blacklisted title keywords
// ============================================================

let glassdoorObserver = null;
let glassdoorFilters = {};

// ── Helpers (same logic as naukri-content.js) ─────────────────

function gdNormalizeText(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function gdTitleMatchesBlacklist(keyword, normalizedTitle) {
  const normalizedKeyword = gdNormalizeText(keyword);
  const keywordWords = normalizedKeyword.split(' ');
  const titleWords = normalizedTitle.split(' ');

  if (keywordWords.length > 1) {
    const regex = new RegExp(`\\b${normalizedKeyword.replace(/\s+/g, '\\s+')}\\b`);
    if (regex.test(normalizedTitle)) return true;
    const compressedKeyword = keywordWords.join('');
    const compressedTitle = normalizedTitle.replace(/\s/g, '');
    return compressedTitle.includes(compressedKeyword);
  } else {
    return titleWords.includes(normalizedKeyword);
  }
}

function gdCompanyMatchesBlacklist(companyText, blacklistedCompanies) {
  // Exact match only, case-insensitive.
  // "inmobi" matches "InMobi" but NOT "InMobi Technologies"
  const trimmedCompany = companyText.trim().toLowerCase();
  return blacklistedCompanies.some(name => trimmedCompany === name.trim().toLowerCase());
}

// ── Card Processor ────────────────────────────────────────────
//
// Glassdoor card structure (verified via debug panel):
//   li[data-test="jobListing"]                          <- one card per job
//     a[data-test="job-title"]                          <- job title
//     span.EmployerProfile_compactEmployerName__9MGcV   <- company name
//     button[data-test="save-job"]                      <- aria-label="Saved" when saved

function processGlassdoorCard(li) {
  const titleEl   = li.querySelector('a[data-test="job-title"]');
  const companyEl = li.querySelector('span.EmployerProfile_compactEmployerName__9MGcV');
  const saveBtn   = li.querySelector('button[data-test="save-job"]');

  if (!titleEl || !companyEl) return; // not a real job card (nudge cards etc.)

  const title           = titleEl.textContent.trim();
  const company         = companyEl.textContent.trim();
  const isSaved         = saveBtn?.getAttribute('aria-label') === 'Saved';
  const normalizedTitle = gdNormalizeText(title);

  let shouldHide = false;

  // 1. Hide saved jobs
  if (!shouldHide && glassdoorFilters.hideSaved && isSaved) {
    shouldHide = true;
  }

  // 2. Blacklisted company (exact match, case-insensitive)
  if (!shouldHide && glassdoorFilters.blacklistedCompanies.length > 0) {
    shouldHide = gdCompanyMatchesBlacklist(company, glassdoorFilters.blacklistedCompanies);
  }

  // 3. Blacklisted title keywords
  if (!shouldHide && glassdoorFilters.blacklistedKeywords.length > 0) {
    shouldHide = glassdoorFilters.blacklistedKeywords.some(kw =>
      gdTitleMatchesBlacklist(kw, normalizedTitle)
    );
  }

  // Hide the whole <li> card
  li.style.display = shouldHide ? 'none' : '';
}

// ── Main Filter Runner ────────────────────────────────────────

function filterGlassdoorJobs() {
  document.querySelectorAll('li[data-test="jobListing"]').forEach(processGlassdoorCard);
}

// ── Save-button Click Listener ────────────────────────────────
// When user saves a job, hide it after the DOM updates the aria-label.

document.addEventListener('click', function(event) {
  if (!glassdoorFilters.hideSaved) return;

  const saveBtn = event.target.closest('button[data-test="save-job"]');
  if (!saveBtn) return;

  const li = saveBtn.closest('li[data-test="jobListing"]');
  if (!li) return;

  setTimeout(() => {
    // Re-check: if now showing "Saved", hide the card
    const isNowSaved = saveBtn.getAttribute('aria-label') === 'Saved';
    if (isNowSaved) {
      li.style.display = 'none';
    }
  }, 600); // small delay for Glassdoor DOM to update aria-label
}, true);

// ── Init ──────────────────────────────────────────────────────

function glassdoorLoadFiltersAndRun() {
  chrome.storage.sync.get(
    ['glassdoor_blacklistedKeywords', 'glassdoor_blacklistedCompanies', 'glassdoor_hideSaved'],
    (data) => {
      glassdoorFilters = {
        blacklistedKeywords:  data.glassdoor_blacklistedKeywords  || [],
        blacklistedCompanies: data.glassdoor_blacklistedCompanies || [],
        hideSaved:            data.glassdoor_hideSaved            || false,
      };
      filterGlassdoorJobs();
    }
  );
}

function glassdoorStartObserver() {
  if (glassdoorObserver) glassdoorObserver.disconnect();

  // Watch the job list <ul> — new <li> cards are injected here on "Show more jobs" click
  const target = document.querySelector('ul.JobsList_jobsList__lqjTr') || document.body;

  glassdoorObserver = new MutationObserver((mutations) => {
    const hasNewNodes = mutations.some(m => m.addedNodes.length > 0);
    if (hasNewNodes) {
      filterGlassdoorJobs();
    }
  });

  glassdoorObserver.observe(target, { childList: true, subtree: true });
}

// Re-run whenever settings change in popup
chrome.storage.onChanged.addListener((changes) => {
  const gdKeys = ['glassdoor_blacklistedKeywords', 'glassdoor_blacklistedCompanies', 'glassdoor_hideSaved'];
  const hasGdChange = Object.keys(changes).some(k => gdKeys.includes(k));
  if (hasGdChange) {
    glassdoorLoadFiltersAndRun();
  }
});

// Kick off — wait for job list to exist first
if (document.querySelector('ul.JobsList_jobsList__lqjTr')) {
  glassdoorLoadFiltersAndRun();
  glassdoorStartObserver();
} else {
  const waitObserver = new MutationObserver(() => {
    if (document.querySelector('ul.JobsList_jobsList__lqjTr')) {
      waitObserver.disconnect();
      glassdoorLoadFiltersAndRun();
      glassdoorStartObserver();
    }
  });
  waitObserver.observe(document.body, { childList: true, subtree: true });
}
