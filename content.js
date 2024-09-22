chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "error") {
    showNotification('Error', message.message, 'error');
  } else if (message.type === "success") {
    showNotification('Success', message.message, 'success');
    navigator.clipboard.writeText(message.cid)
      .then(() => console.log('CID copied to clipboard'))
      .catch(err => console.error('Failed to copy CID: ', err));
  }
  sendResponse({received: true});
});

function showNotification(title, message, type) {
  const notification = document.createElement('div');
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 10px 20px;
    border-radius: 5px;
    color: white;
    font-family: Arial, sans-serif;
    z-index: 9999;
  `;
  notification.style.backgroundColor = type === 'error' ? '#f44336' : '#4CAF50';
  
  const titleElement = document.createElement('h3');
  titleElement.textContent = title;
  titleElement.style.margin = '0 0 5px 0';
  
  const messageElement = document.createElement('p');
  messageElement.textContent = message;
  messageElement.style.margin = '0';
  
  notification.appendChild(titleElement);
  notification.appendChild(messageElement);
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.opacity = '0';
    notification.style.transition = 'opacity 0.5s';
    setTimeout(() => {
      document.body.removeChild(notification);
    }, 500);
  }, 3000);
}