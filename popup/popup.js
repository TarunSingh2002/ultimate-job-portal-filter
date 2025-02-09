document.getElementById('saveButton').addEventListener('click', () => {
  const titleKeywords = document.getElementById('titleKeywords').value
    .toLowerCase()
    .split(',')
    .map(k => k.trim())
    .filter(k => k);
  
  const companyNames = document.getElementById('companyNames').value
    .toLowerCase()
    .split(',')
    .map(c => c.trim())
    .filter(c => c);

  chrome.storage.sync.set({ titleKeywords, companyNames }, () => {
    // Show confirmation tick
    const status = document.createElement('div');
    status.textContent = '✓';
    status.className = 'save-status';
    document.body.appendChild(status);
    
    // Close after 1 second
    setTimeout(() => window.close(), 1000);
  });
});

// Load saved filters (modified to preserve original formatting)
chrome.storage.sync.get(['titleKeywords', 'companyNames'], (data) => {
  document.getElementById('titleKeywords').value = 
    data.titleKeywords?.join(',') || '';
  document.getElementById('companyNames').value = 
    data.companyNames?.join(',') || '';
});