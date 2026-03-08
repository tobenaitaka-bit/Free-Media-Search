// background.js — Handle download requests from popup

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'download') {
    const { url, filename } = message;

    chrome.downloads.download(
      {
        url: url,
        filename: filename || undefined,
        saveAs: false
      },
      (downloadId) => {
        if (chrome.runtime.lastError) {
          sendResponse({ success: false, error: chrome.runtime.lastError.message });
        } else {
          sendResponse({ success: true, downloadId });
        }
      }
    );

    // Return true to indicate async sendResponse
    return true;
  }
});
