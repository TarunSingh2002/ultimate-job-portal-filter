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

  const hideApplied = document.getElementById('hideApplied').checked;
  const hidePromoted = document.getElementById('hidePromoted').checked;
  const hideDismissed = document.getElementById('hideDismissed').checked;

  chrome.storage.sync.set({ 
    titleKeywords, 
    companyNames,
    hideApplied,
    hidePromoted,
    hideDismissed
  }, () => {
    const status = document.createElement('div');
    status.textContent = '✓';
    status.className = 'save-status';
    document.body.appendChild(status);
    setTimeout(() => window.close(), 1000);
  });
});

chrome.storage.sync.get(
  ['titleKeywords', 'companyNames', 'hideApplied', 'hidePromoted', 'hideDismissed'], 
  (data) => {
    document.getElementById('titleKeywords').value = data.titleKeywords?.join(',') || '';
    document.getElementById('companyNames').value = data.companyNames?.join(',') || '';
    document.getElementById('hideApplied').checked = data.hideApplied || false;
    document.getElementById('hidePromoted').checked = data.hidePromoted || false;
    document.getElementById('hideDismissed').checked = data.hideDismissed || false;
  }
);