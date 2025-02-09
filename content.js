let observer;
let currentFilters = {};

function initializeFilters() {
  chrome.storage.sync.get(null, (data) => {
    currentFilters = {
      titleRegex: data.titleKeywords?.length > 0 
        ? new RegExp(`\\b(${data.titleKeywords.join('|')})\\b`, 'i') 
        : /(?!)/,
      companyRegex: data.companyNames?.length > 0
        ? new RegExp(`\\b(${data.companyNames.join('|')})\\b`, 'i')
        : /(?!)/,
      hideApplied: data.hideApplied || false,
      hidePromoted: data.hidePromoted || false,
      hideDismissed: data.hideDismissed || false
    };
    filterJobs();
  });
}

function filterJobs() {
  const jobCards = document.querySelectorAll('.scaffold-layout__list-item');
  
  jobCards.forEach(card => {
    const titleElement = card.querySelector('.job-card-list__title--link');
    const companyElement = card.querySelector('.artdeco-entity-lockup__subtitle span');
    
    if (!titleElement || !companyElement) return;

    const title = titleElement.textContent.trim().toLowerCase();
    const company = companyElement.textContent.trim().toLowerCase();
    
    let shouldHide = currentFilters.titleRegex.test(title) || 
                    currentFilters.companyRegex.test(company);

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
  });
}

function initObserver() {
  observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      if (mutation.addedNodes.length) {
        filterJobs();
      }
    });
  });

  observer.observe(document.querySelector('.scaffold-layout__list'), {
    childList: true,
    subtree: true
  });
}

// Initial setup
if (document.querySelector('.scaffold-layout__list')) {
  initializeFilters();
  initObserver();
}

// Listen for filter changes
chrome.storage.onChanged.addListener(initializeFilters);