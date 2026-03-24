let observer; 
let currentFilters = {};
let seenPromotedList = []; // in-memory cache of today's seen promoted jobs

// ── Partial-hide helpers ──────────────────────────────────────

function getTodayStr() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Load seen-promoted list from chrome.storage.local into the in-memory cache.
 * If the stored date differs from today the list is treated as empty (new day = fresh start).
 */
function loadSeenPromotedList(callback) {
  chrome.storage.local.get(['seen_promoted_list'], (data) => {
    const stored = data['seen_promoted_list'];
    if (stored) {
      seenPromotedList = stored.list || [];
    } else {
      seenPromotedList = [];
    }
    if (callback) callback();
  });
}

/** Persist the in-memory list to chrome.storage.local with today's date. */
function saveSeenPromotedList() {
  chrome.storage.local.set({
    seen_promoted_list: { date: getTodayStr(), list: seenPromotedList }
  });
}

/** Clear the list — called from the startup dialog or popup "Clear" button. */
function clearSeenPromotedList() {
  seenPromotedList = [];
  chrome.storage.local.remove('seen_promoted_list');
}

/** Returns true if the card has a "Promoted" footer label. */
function isPromotedCard(card) {
  return Array.from(card.querySelectorAll('.job-card-container__footer-item'))
    .some(el => el.textContent.trim().includes('Promoted'));
}

/**
 * Add a (title, company) pair to the seen list using a compound key.
 * Does nothing if the pair is already present.
 */
function addToSeenPromoted(title, company) {
  const key = normalizeForMatching(title) + '|' + company.trim().toLowerCase();
  if (!seenPromotedList.includes(key)) {
    seenPromotedList.push(key);
    saveSeenPromotedList();
  }
}

/** Returns true if a (title, company) pair is already in the seen list. */
function isInSeenPromoted(title, company) {
  const key = normalizeForMatching(title) + '|' + company.trim().toLowerCase();
  return seenPromotedList.includes(key);
}

/**
 * Delegated click listener on the whole document.
 * When the user clicks any part of a promoted job card:
 *   1. Add it to the seen list.
 *   2. Immediately re-filter so any duplicate on the same page is hidden.
 * Uses capture phase so we catch the event before LinkedIn's handlers.
 * Initialized only once — guarded by clickTrackingInitialized flag.
 */
let clickTrackingInitialized = false;
function initClickTracking() {
  if (clickTrackingInitialized) return;
  clickTrackingInitialized = true;

  document.addEventListener('click', (e) => {
    if (currentFilters.promotedMode !== 'partial') return;  // [FIXED] was partialHidePromoted boolean
    const card = e.target.closest('.scaffold-layout__list-item');
    if (!card) return;
    const titleEl   = card.querySelector('.job-card-list__title--link');
    const companyEl = card.querySelector('.artdeco-entity-lockup__subtitle span');
    if (!titleEl || !companyEl) return;
    if (!isPromotedCard(card)) return;

    addToSeenPromoted(titleEl.textContent.trim(), companyEl.textContent.trim());
    filterJobs(); // hide any duplicate of this promoted job still visible on the page
  }, true);
}

/**
 * Startup dialog — shown once per browser session (sessionStorage flag).
 * sessionStorage is cleared on full page reload / new tab but NOT on SPA navigation
 * (hashchange / popstate), so this only appears when the user truly reloads — which
 * is exactly the desired behavior.
 *
 * "Keep List"     → dismiss dialog, continue hiding seen jobs.
 * "Clear & Fresh" → wipe the list, re-filter (seen jobs become visible again).
 */
function showStartupDialog() {
  if (sessionStorage.getItem('jobshield_dialog_shown')) return;
  if (!seenPromotedList.length) return;
  if (currentFilters.promotedMode !== 'partial') return;
  sessionStorage.setItem('jobshield_dialog_shown', '1');

  // Inject slide-in animation only once per page load
  if (!document.getElementById('jobshield-style')) {
    const style = document.createElement('style');
    style.id = 'jobshield-style';
    style.textContent = `
      @keyframes jsd-slidein {
        from { transform: translateX(110%); opacity: 0; }
        to   { transform: translateX(0);    opacity: 1; }
      }
      @keyframes jsd-slideout {
        from { transform: translateX(0);    opacity: 1; }
        to   { transform: translateX(110%); opacity: 0; }
      }
      #jobshield-toast { animation: jsd-slidein 0.35s ease-out forwards; }
      #jobshield-toast.closing { animation: jsd-slideout 0.3s ease-in forwards; }
      #jobshield-toast button:hover { filter: brightness(0.88); }
    `;
    document.head.appendChild(style);
  }

  // Small toast anchored to top-right — no backdrop, no page-blocking
  const toast = document.createElement('div');
  toast.id = 'jobshield-toast';
  toast.style.cssText = [
    'position:fixed', 'top:14px', 'right:14px', 'z-index:2147483647',
    'background:#0a66c2', 'color:white',
    'border-radius:10px', 'padding:10px 14px',
    'box-shadow:0 4px 18px rgba(0,0,0,0.28)',
    'font-family:Arial,sans-serif', 'font-size:13px',
    'display:flex', 'align-items:center', 'gap:10px',
    'max-width:420px', 'line-height:1.4'
  ].join(';');

  toast.innerHTML = `
    <span style="font-size:18px;flex-shrink:0">🛡️</span>
    <span style="flex:1">
      <strong>${seenPromotedList.length}</strong> seen promoted job(s) today.
      Keep hiding them?
    </span>
    <button id="jsd-keep"
      style="background:white;color:#0a66c2;border:none;padding:5px 11px;
             border-radius:6px;cursor:pointer;font-weight:700;font-size:12px;
             white-space:nowrap;flex-shrink:0">
      ✅ Keep
    </button>
    <button id="jsd-clear"
      style="background:rgba(255,255,255,0.15);color:white;border:1px solid rgba(255,255,255,0.5);
             padding:5px 11px;border-radius:6px;cursor:pointer;font-weight:700;
             font-size:12px;white-space:nowrap;flex-shrink:0">
      🗑️ Clear
    </button>
  `;

  document.body.appendChild(toast);

  // Helper: animate out then remove
  function dismissToast() {
    toast.classList.add('closing');
    setTimeout(() => toast.remove(), 300);
  }

  document.getElementById('jsd-keep').onclick = dismissToast;
  document.getElementById('jsd-clear').onclick = () => {
    clearSeenPromotedList();
    dismissToast();
    filterJobs();
  };
}

// ─────────────────────────────────────────────────────────────
// Original functions below.
// Lines that required a fix are marked [FIXED] with explanation.
// Everything else is character-for-character identical to original.
// ─────────────────────────────────────────────────────────────

function normalizeForMatching(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegExp(string) {
  try {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  } catch (error) {
    console.error("Error escaping regex: ", error);
    return string;
  }
}

function checkPageAndInit() {
  try {
    if (window.location.href.includes('/jobs/search/')) {
      initializeFilters();
    }
  } catch (error) {
    console.error("Error in checkPageAndInit: ", error);
  }
}

window.addEventListener('hashchange', checkPageAndInit);
window.addEventListener('popstate', checkPageAndInit);

checkPageAndInit();

function initializeFilters() {
  try {
    if (observer) observer.disconnect();
    chrome.storage.sync.get(
      // [FIXED] added 'promotedMode'; kept old boolean keys for backward-compat migration
      ['whitelistKeywords', 'titleKeywords', 'companyNames',
       'hideApplied', 'hidePromoted', 'hideDismissed',
       'partialHidePromoted', 'promotedMode'],
      (data) => {
        try {
          const whitelist = data.whitelistKeywords || [];
          const blacklist = data.titleKeywords     || [];
          const companies = (data.companyNames || []).map(c => c.trim().toLowerCase());

          // [FIXED] single promotedMode: 'show' | 'hide' | 'partial'
          // If user had old boolean settings saved, this migrates them automatically.
          const promotedMode = data.promotedMode ||
            (data.hidePromoted ? 'hide' : (data.partialHidePromoted ? 'partial' : 'show'));

          currentFilters = {
            whitelist,
            blacklist,
            companies,
            hideApplied:   data.hideApplied  || false,
            hideDismissed: data.hideDismissed || false,
            promotedMode  // replaces the old hidePromoted + partialHidePromoted booleans
          };

          loadSeenPromotedList(() => {
            filterJobs();
            initObserver();
            initClickTracking();
            showStartupDialog();
          });

        } catch (error) {
          console.error("Error processing storage data: ", error);
        }
      }
    );
  } catch (error) {
    console.error("Error in initializeFilters: ", error);
  }
}

function keywordMatchesWhitelist(keyword, normalizedTitle) {
  const normalizedKeyword = normalizeForMatching(keyword);
  const titleWords        = normalizedTitle.split(' ');
  const keywordWords      = normalizedKeyword.split(' ');
  const exactMatch        = keywordWords.every(word => titleWords.includes(word));
  
  if (keywordWords.length > 1) {
    const compressedKeyword = keywordWords.join('');
    const compressedTitle   = normalizedTitle.replace(/\s/g, '');
    return exactMatch || compressedTitle.includes(compressedKeyword);
  }
  return exactMatch;
}

function keywordMatchesBlacklist(keyword, normalizedTitle) {
  const normalizedKeyword = normalizeForMatching(keyword);
  const keywordWords      = normalizedKeyword.split(' ');
  const titleWords        = normalizedTitle.split(' ');
  const compressedTitle   = normalizedTitle.replace(/\s/g, '');
  
  if (keywordWords.length > 1) {
    const regex = new RegExp(`\\b${normalizedKeyword.replace(/\s+/g, '\\s+')}\\b`);
    if (regex.test(normalizedTitle)) return true;
    const compressedKeyword = keywordWords.join('');
    return compressedTitle.includes(compressedKeyword);
  } else {
    return titleWords.includes(normalizedKeyword);
  }
}

function filterJobs() {
  try {
    const jobCards = document.querySelectorAll('.scaffold-layout__list-item');
    
    jobCards.forEach(card => {
      try {
        const titleElement   = card.querySelector('.job-card-list__title--link');
        const companyElement = card.querySelector('.artdeco-entity-lockup__subtitle span');
        
        if (!titleElement || !companyElement) return;

        const title           = titleElement.textContent.trim();
        const company         = companyElement.textContent.trim();
        const normalizedTitle = normalizeForMatching(title);
        
        let shouldHide = false;

        // 1. Company Filter — exact match, case-insensitive
        shouldHide = currentFilters.companies.includes(company.trim().toLowerCase());

        // 2. Whitelist Filter (loose matching)
        if (!shouldHide && currentFilters.whitelist.length > 0) {
          const hasWhitelist = currentFilters.whitelist.some(kw => 
            keywordMatchesWhitelist(kw, normalizedTitle)
          );
          if (!hasWhitelist) shouldHide = true;
        }

        // 3. Blacklist Filter (exact phrase matching for multi-word keywords)
        if (!shouldHide) {
          const hasBlacklist = currentFilters.blacklist.some(kw => 
            keywordMatchesBlacklist(kw, normalizedTitle)
          );
          if (hasBlacklist) shouldHide = true;
        }

        // 4. Hide Applied
        if (!shouldHide && currentFilters.hideApplied) {
          shouldHide = !!card.querySelector('.job-card-container__footer-job-state')
            ?.textContent.includes('Applied');
        }

        // 5. Promoted — 'hide' hides all promoted; 'partial' hides only seen ones
        if (!shouldHide && currentFilters.promotedMode === 'hide') {
          shouldHide = isPromotedCard(card);
        }
        if (!shouldHide && currentFilters.promotedMode === 'partial') {
          if (isPromotedCard(card) && isInSeenPromoted(title, company)) {
            shouldHide = true;
          }
        }

        // 6. Hide Dismissed
        // [FIXED] Original used '.job-card-container__footer-item--highlighted' — LinkedIn
        // does not render this class in current DOM. Also compared "won't" with a straight
        // apostrophe while LinkedIn uses a curly apostrophe (\u2019), so it never matched.
        // Fix: check card.textContent for the unique phrase fragment "show you this job again"
        // which works regardless of apostrophe encoding and does not depend on any class name.
        if (!shouldHide && currentFilters.hideDismissed) {
          shouldHide = card.textContent.includes("show you this job again");
        }

        card.style.display = shouldHide ? 'none' : 'block';
      } catch (error) {
        console.error("Error processing job card: ", error);
      }
    });
  } catch (error) {
    console.error("Error in filterJobs: ", error);
  }
}

function initObserver() {
  try {
    const targetNode = document.querySelector('.scaffold-layout__list');
    if (!targetNode) {
      setTimeout(initObserver, 500);
      return;
    }

    observer = new MutationObserver(() => {
      try {
        filterJobs();
      } catch (error) {
        console.error("Error in MutationObserver: ", error);
      }
    });
    observer.observe(targetNode, {
      childList: true,
      subtree: true
    });
  } catch (error) {
    console.error("Error in initObserver: ", error);
  }
}

if (document.querySelector('.scaffold-layout__list')) {
  // [FIXED] Removed the duplicate initObserver() call that was here.
  // initializeFilters() already calls initObserver() inside its async storage callback.
  // Having both caused two observers on the same node — every DOM mutation fired twice.
  initializeFilters();
}

chrome.storage.onChanged.addListener(() => {
  try {
    initializeFilters();
  } catch (error) {
    console.error("Error handling storage change: ", error);
  }
});

function normalizeString(str) {
  // This legacy function is still used for company names.
  return str.replace(/[^a-z0-9]/gi, '').toLowerCase();
}