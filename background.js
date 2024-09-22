import { createHelia } from 'helia';
import { unixfs } from '@helia/unixfs';

let helia;
let fs;

const ipfs_gateway = 'https://ipfs.cloud.fx.land';
let heliaRunning = false;

const initHelia = async () => {
  try {
    helia = await createHelia({
      // Chrome extension specific configurations can be added here
    });
    fs = unixfs(helia);
    console.log('Helia node is running');
    return helia;
  } catch (error) {
    console.error('Failed to create Helia node:', error);
    throw error;
  }
};

async function ensureHeliaRunning() {
  if (!heliaRunning) {
    try {
      await initHelia();
      heliaRunning = true;
    } catch (error) {
      console.error('Failed to initialize Helia:', error);
      throw error;
    }
  }
}

chrome.runtime.onInstalled.addListener(async function() {
  try {
    await initHelia();

    chrome.contextMenus.create({
      id: "saveToFula",
      title: "Save to Fula",
      contexts: ["image", "video"]
    });
  } catch (error) {
    console.error('Failed to initialize Helia:', error);
  }
});

chrome.contextMenus.onClicked.addListener(async function(info, tab) {
  if (info.menuItemId === "saveToFula") {
    try {
      await ensureHeliaRunning();
      const { apiKey } = await chrome.storage.local.get('apiKey');
      if (!apiKey) {
        throw new Error("API key not set. Please set up your API key first.");
      }
      await downloadAndPin(info.srcUrl, apiKey, tab);
    } catch (error) {
      console.error('Error:', error);
      chrome.tabs.sendMessage(tab.id, { type: "error", message: error.message });
    }
  }
});

chrome.runtime.onStartup.addListener(() => {
  heliaRunning = false;
});

chrome.runtime.onSuspend.addListener(() => {
  heliaRunning = false;
});

async function downloadAndPin(url, apiKey, tab) {
  const pinId = Date.now().toString();
  try {
    updatePinStatus(pinId, 'started', 'Saving the file...');
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    console.log('object was fetched');
    updatePinStatus(pinId, 'saved', 'Saved object locally');
    const blob = await response.blob();
    const buffer = await blob.arrayBuffer();

    if (!fs) {
      throw new Error('Helia is not initialized');
    }

    updatePinStatus(pinId, 'uploading', 'Uploading to Helia...');
    const result = await fs.addBytes(new Uint8Array(buffer));
    const cid = result.toString();
    console.log('cid created from object: '+cid);

    // Create file name
    const filename = getFilenameFromUrl(url);
    const pageUrl = tab.url || 'No URL';
    const currentDateTime = new Date().toISOString();
    const name = `fula-${pageUrl}-${currentDateTime}-${filename}`;
    console.log('name of file='+name);

    // Upload file to server
    updatePinStatus(pinId, 'uploading', 'Uploading to server...');
    const formData = new FormData();
    formData.append('file', blob);
    const serverResponse = await fetch(ipfs_gateway + '/upload', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      body: formData
    });

    if (!serverResponse.ok) {
      throw new Error(`Server upload failed: ${serverResponse.status}`);
    }

    const { cid: cid_server } = await serverResponse.json();
    console.log('CID received from server:', cid_server);
    if (cid !== cid_server) {
      console.error('Received pin is different than expected');
      updatePinStatus(pinId, 'error', 'Received pin is different than expected');
      sendMessageToActiveTab({ type: "error", message: 'Received pin is different than expected' }, tab.id);
    } else {
      updatePinStatus(pinId, 'pinning', 'Pinning to Fula...');
      await pinToFula(cid, apiKey, name);
      updatePinStatus(pinId, 'pinned', 'Pinned successfully');
      console.log('File successfully pinned to Fula');

      sendMessageToActiveTab({ 
        type: "success", 
        message: `File uploaded and pinned. CID: ${cid}`,
        cid: cid
      }, tab.id);
    }

  } catch (error) {
    console.error('Failed to download and pin file:', error);
    updatePinStatus(pinId, 'error', `Error: ${error.message}`);
    sendMessageToActiveTab({ type: "error", message: error.message }, tab.id);
  }
}

function getFilenameFromUrl(url) {
  const urlParts = url.split('/');
  let filename = urlParts[urlParts.length - 1];
  filename = filename.split('?')[0];
  filename = decodeURIComponent(filename);
  return filename || 'unknown';
}

function updatePinStatus(id, status, message) {
  chrome.storage.local.get('pinningStatus', (data) => {
    const pinningStatus = data.pinningStatus || {};
    pinningStatus[id] = { status, message, timestamp: Date.now() };
    chrome.storage.local.set({ pinningStatus });
    chrome.runtime.sendMessage({ action: 'pinningStatus', id, status, message });
  });
}

function sendMessageToActiveTab(message) {
  chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, message, (response) => {
        if (chrome.runtime.lastError) {
          console.log('Error sending message:', chrome.runtime.lastError);
        } else {
          console.log('Message sent successfully');
        }
      });
    }
  });
}


async function pinToFula(cid, apiKey, name) {
  console.log(`Attempting to pin CID: ${cid} to Fula`);
  try {
    const sanitizedName = name.replace(/[^a-zA-Z0-9-_\.]/g, '_').substring(0, 255);

    const response = await fetch('https://api.cloud.fx.land/pins', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        cid: cid,
        name: sanitizedName
      })
    });

    console.log(`Received response from Fula API. Status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to pin file. Status: ${response.status}, Error: ${errorText}`);
      throw new Error(`Failed to pin file: ${response.status} - ${errorText}`);
    }

    const responseData = await response.json();
    console.log(`Successfully pinned file. Response:`, responseData);
    return responseData;
  } catch (error) {
    console.error(`Error in pinToFula function:`, error);
    throw error;
  }
}

console.log('Background script loaded');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Background script received message:', request);
  if (request.action === "initHelia") {
    initHelia()
      .then(() => {
        console.log('Helia initialized successfully');
        sendResponse({success: true});
      })
      .catch(error => {
        console.error('Failed to initialize Helia:', error);
        sendResponse({success: false, error: error.message});
      });
    return true; // Indicates that the response is asynchronous
  }
});