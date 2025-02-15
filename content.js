let observer;
let currentFilters = {};

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
      ['whitelistKeywords', 'titleKeywords', 'companyNames', 'hideApplied', 'hidePromoted', 'hideDismissed'], 
      (data) => {
        try {
          // Process keywords
          const whitelist = data.whitelistKeywords?.map(normalizeString) || [];
          const blacklist = data.titleKeywords?.map(normalizeString) || [];
          const escapedCompanies = data.companyNames?.map(escapeRegExp) || [];

          currentFilters = {
            whitelist,
            blacklist,
            companyRegex: escapedCompanies.length 
              ? new RegExp(`\\b(${escapedCompanies.join('|')})\\b`, 'i') 
              : /(?!)/,
            hideApplied: data.hideApplied || false,
            hidePromoted: data.hidePromoted || false,
            hideDismissed: data.hideDismissed || false
          };
          
          filterJobs();
          initObserver();
        } catch (error) {
          console.error("Error processing storage data: ", error);
        }
      }
    );
  } catch (error) {
    console.error("Error in initializeFilters: ", error);
  }
}

function filterJobs() {
  try {
    const jobCards = document.querySelectorAll('.scaffold-layout__list-item');
    
    jobCards.forEach(card => {
      try {
        const titleElement = card.querySelector('.job-card-list__title--link');
        const companyElement = card.querySelector('.artdeco-entity-lockup__subtitle span');
        
        if (!titleElement || !companyElement) return;

        const title = titleElement.textContent.trim();
        const company = companyElement.textContent.trim();
        const normalizedTitle = normalizeString(title);
        
        let shouldHide = false;

        // 1. Company Filter
        shouldHide = currentFilters.companyRegex.test(company);

        // 2. Whitelist Filter
        if (!shouldHide && currentFilters.whitelist.length > 0) {
          const hasWhitelist = currentFilters.whitelist.some(kw => 
            normalizedTitle.includes(kw)
          );
          if (!hasWhitelist) shouldHide = true;
        }

        // 3. Blacklist Filter
        if (!shouldHide) {
          const hasBlacklist = currentFilters.blacklist.some(kw => 
            normalizedTitle.includes(kw)
          );
          if (hasBlacklist) shouldHide = true;
        }

        // Existing filters (Applied, Promoted, Dismissed)
        if (!shouldHide && currentFilters.hideApplied) {
          shouldHide = card.querySelector('.job-card-container__footer-job-state')?.textContent.includes('Applied');
        }

        if (!shouldHide && currentFilters.hidePromoted) {
          shouldHide = Array.from(card.querySelectorAll('.job-card-container__footer-item'))
            .some(el => el.textContent.includes('Promoted'));
        }

        if (!shouldHide && currentFilters.hideDismissed) {
          shouldHide = card.querySelector('.job-card-container__footer-item--highlighted')
            ?.textContent.includes('We won’t show you this job again');
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
  initializeFilters();
  initObserver();
}

chrome.storage.onChanged.addListener(() => {
  try {
    initializeFilters();
  } catch (error) {
    console.error("Error handling storage change: ", error);
  }
});

function normalizeString(str) {
  return str.replace(/[^a-z0-9]/gi, '').toLowerCase();
}