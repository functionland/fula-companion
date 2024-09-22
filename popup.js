let currentPage = 1;
const itemsPerPage = 10;
const ipfs_gateway = 'https://ipfs.cloud.fx.land';

function showPinningProgress(id, status) {
  showElement('pinningProgress');
  const statusList = document.getElementById('pinningStatusList');
  const statusItem = document.createElement('li');
  statusItem.id = `pinning-${id}`;
  statusItem.textContent = status;
  statusList.appendChild(statusItem);
}

function updatePinningStatus(id, status) {
  const statusItem = document.getElementById(`pinning-${id}`);
  if (statusItem) {
    statusItem.textContent = status;
  }
}

function removePinningStatus(id) {
  setTimeout(() => {
    const statusItem = document.getElementById(`pinning-${id}`);
    if (statusItem) {
      statusItem.remove();
    }
    if (document.getElementById('pinningStatusList').children.length === 0) {
      hideElement('pinningProgress');
    }
  }, 10000);
}

// Add this to your existing chrome.runtime.onMessage listener
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'pinningStatus') {
    if (message.status === 'started') {
      showPinningProgress(message.id, 'Saving the file...');
    } else if (message.status === 'uploading') {
      updatePinningStatus(message.id, 'Uploading to Helia...');
    } else if (message.status === 'sending') {
      updatePinningStatus(message.id, 'Sending request to Fula...');
    } else if (message.status === 'pinned') {
      updatePinningStatus(message.id, 'Pinned successfully');
      removePinningStatus(message.id);
    }
  }
});

document.addEventListener('DOMContentLoaded', async function() {
  try {
    console.log('Sending initHelia message to background script');
    const response = await chrome.runtime.sendMessage({action: "initHelia"});
    console.log('Received response from background script:', response);
    if (!response || !response.success) {
      throw new Error(response ? response.error : 'No response from background script');
    }
    console.log('Helia node is running');
    
    const { apiKey } = await chrome.storage.local.get('apiKey');
    if (apiKey) {
      showPinnedItems(apiKey);
    } else {
      showSetup();
    }
  } catch (error) {
    showError('Failed to initialize Helia: ' + error.message);
  }

  document.getElementById('saveApiKey').addEventListener('click', saveApiKey);
  document.getElementById('prevPage').addEventListener('click', () => changePage(-1));
  document.getElementById('nextPage').addEventListener('click', () => changePage(1));

  // Check for ongoing uploads
  chrome.storage.local.get('pinningStatus', (data) => {
    const pinningStatus = data.pinningStatus || {};
    Object.entries(pinningStatus).forEach(([id, status]) => {
      if (status.status !== 'pinned' && status.status !== 'error') {
        showPinningProgress(id, `${status.status}: ${status.message}`);
      }
    });
  });
});

async function saveApiKey() {
  const apiKey = document.getElementById('apiKey').value.trim();
  if (!apiKey) {
    showError('Please enter a valid API key');
    return;
  }

  try {
    await chrome.storage.local.set({ apiKey });
    showPinnedItems(apiKey);
  } catch (error) {
    showError('Failed to save API key: ' + error.message);
  }
}

async function showPinnedItems(apiKey) {
  showLoading();
  try {
    const data = await fetchPinnedItems(apiKey);
    renderPinnedItems(data);
    hideLoading();
    showElement('pinnedItems');
    hideElement('setup');
  } catch (error) {
    hideLoading();
    showError('Failed to fetch pinned items: ' + error.message);
  }
}

async function fetchPinnedItems(apiKey) {
  try {
    const response = await fetch(`https://api.cloud.fx.land/pins?limit=${itemsPerPage}&offset=${(currentPage - 1) * itemsPerPage}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (!response.ok) {
      if (response.status === 500) {
        throw new Error('Fula API server error. Please try again later.');
      }
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching pinned items:', error);
    throw error;
  }
}

function renderPinnedItems(data) {
  const list = document.getElementById('pinnedList');
  list.innerHTML = '';

  data.results.forEach(item => {
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = `${ipfs_gateway}/gateway/${item.pin.cid}`;
    a.textContent = item.pin.name || 'Unnamed';
    a.target = '_blank'; // Open link in new tab
    li.appendChild(a);
    list.appendChild(li);
  });

  updatePagination(data.count);
}

function updatePagination(totalItems) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  document.getElementById('pageInfo').textContent = `Page ${currentPage} of ${totalPages}`;
  document.getElementById('prevPage').disabled = currentPage === 1;
  document.getElementById('nextPage').disabled = currentPage === totalPages;
}

async function changePage(direction) {
  currentPage += direction;
  const { apiKey } = await chrome.storage.local.get('apiKey');
  showPinnedItems(apiKey);
}

function showSetup() {
  showElement('setup');
  hideElement('pinnedItems');
}

function showLoading() {
  showElement('loading');
}

function hideLoading() {
  hideElement('loading');
}

function showError(message) {
  const errorElement = document.getElementById('error');
  errorElement.querySelector('#errorMessage').textContent = message;
  showElement('error');
}

function showElement(id) {
  document.getElementById(id).classList.remove('hidden');
}

function hideElement(id) {
  document.getElementById(id).classList.add('hidden');
}