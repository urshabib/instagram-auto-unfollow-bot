let isProcessing = false;

async function startUnfollowLoop() {
  // Check if we are already doing something to prevent double-tabs
  if (isProcessing) {
    console.log("Already processing a user. Skipping trigger.");
    return;
  }
  
  const data = await chrome.storage.local.get(['queue', 'count', 'limit', 'isRunning', 'delay']);

  // Stop conditions
  if (!data.isRunning || (data.limit && data.count >= data.limit) || !data.queue || data.queue.length === 0) {
    chrome.storage.local.set({ isRunning: false, activeUser: "Finished" });
    isProcessing = false;
    return;
  }

  isProcessing = true;
  const nextLink = data.queue[0];
  const username = nextLink.split('/').filter(Boolean).pop();
  
  // Remove the user from the queue and set active target
  await chrome.storage.local.set({ 
    queue: data.queue.slice(1), 
    activeUser: `Target: ${username}` 
  });

  chrome.tabs.create({ url: nextLink, active: true });
}

// Global listener for actions
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "START_LOOP") {
    isProcessing = false; // Reset lock on manual start
    startUnfollowLoop();
  }

  if (msg.action === "SKIP_USER") {
    if (sender.tab) chrome.tabs.remove(sender.tab.id);
    isProcessing = false;
    setTimeout(startUnfollowLoop, 1500);
  }

  if (msg.action === "FINISH_USER") {
    if (sender.tab) chrome.tabs.remove(sender.tab.id);
    isProcessing = false;

    chrome.storage.local.get(['history', 'count', 'delay', 'isRunning'], async (s) => {
      let history = s.history || [];
      const now = Date.now();
      history.push(now);
      
      // Keep only last 24h
      const updatedHistory = history.filter(ts => now - ts < 86400000);

      await chrome.storage.local.set({ 
        history: updatedHistory,
        count: (s.count || 0) + 1 
      });

      if (s.isRunning) {
        setTimeout(startUnfollowLoop, (s.delay * 1000));
      }
    });
  }
  return true; // Keep channel open for async
});