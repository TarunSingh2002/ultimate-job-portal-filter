let titleRegex;
let companyRegex;
let observer;

function updateFilters() {
  chrome.storage.sync.get(['titleKeywords', 'companyNames'], (data) => {
    // Handle empty title keywords
    titleRegex = data.titleKeywords?.length > 0 
      ? new RegExp(`\\b(${data.titleKeywords.join('|')})\\b`, 'i') 
      : /(?!)/; // Never matches
    
    // Handle empty company names
    companyRegex = data.companyNames?.length > 0
      ? new RegExp(`\\b(${data.companyNames.join('|')})\\b`, 'i')
      : /(?!)/; // Never matches
    
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
    
    const shouldHide = titleRegex?.test(title) || companyRegex?.test(company);
    
    if (shouldHide) {
      card.style.display = 'none';
    } else {
      card.style.display = 'block';
    }
  });
}

// Initialize observer to detect new job cards
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

// Run initial setup
if (document.querySelector('.scaffold-layout__list')) {
  updateFilters();
  initObserver();
}

// Listen for filter updates
chrome.storage.onChanged.addListener(updateFilters);