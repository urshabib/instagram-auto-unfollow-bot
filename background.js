let isProcessing = false;

async function startUnfollowLoop() {
  if (isProcessing) {
    console.log("Already processing a user. Skipping trigger.");
    return;
  }
  
  const data = await chrome.storage.local.get(['queue', 'count', 'limit', 'isRunning', 'delay']);

  if (!data.isRunning || (data.limit && data.count >= data.limit) || !data.queue || data.queue.length === 0) {
    chrome.storage.local.set({ isRunning: false, activeUser: "Finished" });
    isProcessing = false;
    return;
  }

  isProcessing = true;
  const nextLink = data.queue[0];
  const username = nextLink.split('/').filter(Boolean).pop();
  
  await chrome.storage.local.set({ 
    queue: data.queue.slice(1), 
    activeUser: `Target: ${username}` 
  });

  // active: false opens it quietly in the background
  chrome.tabs.create({ url: nextLink, active: false });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "START_LOOP") {
    isProcessing = false; 
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
      
      const updatedHistory = history.filter(ts => now - ts < 86400000);

      await chrome.storage.local.set({ 
        history: updatedHistory,
        count: (s.count || 0) + 1 
      });

      if (s.isRunning) setTimeout(startUnfollowLoop, (s.delay * 1000));
    });
  }
  return true; 
});