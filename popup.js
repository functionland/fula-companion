let currentPage = 1;
const itemsPerPage = 10;
const ipfs_gateway = 'https://ipfs.cloud.fx.land';

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
      await showPinnedItems(apiKey);
      setActiveTab('pins-tab');
    } else {
      setActiveTab('settings-tab');
    }
  } catch (error) {
    showError('Failed to initialize Helia: ' + error.message);
  }

  document.getElementById('saveApiKey').addEventListener('click', saveApiKey);
  document.getElementById('prevPage').addEventListener('click', () => changePage(-1));
  document.getElementById('nextPage').addEventListener('click', () => changePage(1));

  // Tab navigation
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => setActiveTab(btn.id.replace('-btn', '')));
  });

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

function setActiveTab(tabId) {
  document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById(tabId).classList.add('active');
  document.getElementById(`${tabId}-btn`).classList.add('active');
}

async function saveApiKey() {
  const apiKey = document.getElementById('apiKey').value.trim();
  if (!apiKey) {
    showError('Please enter a valid API key');
    return;
  }

  try {
    await chrome.storage.local.set({ apiKey });
    await showPinnedItems(apiKey);
    setActiveTab('pins-tab');
  } catch (error) {
    showError('Failed to save API key: ' + error.message);
  }
}

async function showPinnedItems(apiKey) {
  showLoading();
  try {
    const data = await fetchPinnedItems(apiKey);
    renderPinnedItems(data);
    updateXPCounter(data.count);
    hideLoading();
    document.getElementById('pins-tab').classList.remove('hidden');
    document.getElementById('settings-tab').classList.add('hidden');
  } catch (error) {
    hideLoading();
    showError('Failed to fetch pinned items: ' + error.message);
  }
}

async function fetchPinnedItems(apiKey) {
  try {
    const response = await fetch(`https://api.cloud.fx.land/pins?limit=${itemsPerPage}&offset=${(currentPage - 1) * itemsPerPage}&status=pinned&sort=created,desc`, {
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
    a.target = '_blank';
    
    a.addEventListener('click', async (event) => {
      event.preventDefault();
      try {
        console.log('download started');
        const response = await fetch(a.href);
        const blob = await response.blob();
        let fileName = item.pin.name || 'file';
        
        // Determine file type based on MIME type
        const mimeType = blob.type;
        let extension = '';
        console.log('mimeType is : '+mimeType);
        
        if (mimeType.startsWith('text/')) extension = '.txt';
        else if (mimeType === 'image/png') extension = '.png';
        else if (mimeType === 'image/jpeg') extension = '.jpg';
        else if (mimeType === 'image/webp') extension = '.webp';
        else if (mimeType === 'video/mp4') extension = '.mp4';
        
        console.log('extension is: '+extension);
        // Add extension if it's not already there
        if (extension && !fileName.toLowerCase().endsWith(extension)) {
          fileName += extension;
        }
        
        const url = URL.createObjectURL(blob);
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.download = fileName;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Download failed:', error);
        showError('Failed to download file: ' + error.message);
      }
    });
    
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
  await showPinnedItems(apiKey);
}

function showPinningProgress(id, status) {
  const statusList = document.getElementById('pinningStatusList');
  let statusItem = document.getElementById(`pinning-${id}`);
  if (!statusItem) {
    statusItem = document.createElement('li');
    statusItem.id = `pinning-${id}`;
    statusList.appendChild(statusItem);
  }
  statusItem.textContent = status;
}

function updatePinningStatus(id, status) {
  showPinningProgress(id, status);
}

function removePinningStatus(id) {
  setTimeout(() => {
    const statusItem = document.getElementById(`pinning-${id}`);
    if (statusItem) {
      statusItem.remove();
    }
  }, 10000);
}

function updateXPCounter(count) {
  document.getElementById('xp-value').textContent = count;
}

function showLoading() {
  document.getElementById('loading').classList.remove('hidden');
}

function hideLoading() {
  document.getElementById('loading').classList.add('hidden');
}

function showError(message) {
  const errorElement = document.getElementById('error');
  errorElement.textContent = message;
  errorElement.classList.remove('hidden');
  setTimeout(() => {
    errorElement.classList.add('hidden');
  }, 5000);
}

// Listen for messages from the background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'pinningStatus') {
    updatePinningStatus(message.id, `${message.status}: ${message.message}`);
    if (message.status === 'pinned' || message.status === 'error') {
      removePinningStatus(message.id);
    }
  }
});