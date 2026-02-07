async function performUnfollow() {
  const data = await chrome.storage.local.get(['isRunning', 'internalDelay', 'keepVerified', 'keepHigh', 'highVal', 'keepBiz']);
  if (!data.isRunning) return;

  const findEl = (txts) => Array.from(document.querySelectorAll('button, span, div[role="button"]'))
    .find(el => txts.some(t => el.innerText.trim().includes(t)));

  // 1. FILTER: Verified (Blue Badge)
  if (data.keepVerified && document.querySelector('svg[aria-label="Verified"]')) {
      return chrome.runtime.sendMessage({ action: "SKIP_USER" });
  }

  // 2. FILTER: High Followers (> User Input)
  if (data.keepHigh) {
    const fLink = document.querySelector('a[href*="/followers/"] span[title]');
    if (fLink) {
      const count = parseInt(fLink.getAttribute('title').replace(/,/g, ''));
      if (count > data.highVal) return chrome.runtime.sendMessage({ action: "SKIP_USER" });
    }
  }

  // 3. FILTER: Business (Check Label)
  if (data.keepBiz && findEl(["Local business", "Public figure", "Creator", "Entrepreneur"])) {
      return chrome.runtime.sendMessage({ action: "SKIP_USER" });
  }

  // ACTION
  const followBtn = findEl(["Following", "Abonné(e)"]);
  if (followBtn) {
    followBtn.click();
    setTimeout(() => {
      const unfollowRow = findEl(["Unfollow", "Se désabonner"]);
      if (unfollowRow) {
        unfollowRow.click();
        setTimeout(() => chrome.runtime.sendMessage({ action: "FINISH_USER" }), 1500);
      } else {
        chrome.runtime.sendMessage({ action: "FINISH_USER" });
      }
    }, (data.internalDelay || 4) * 1000);
  } else {
    chrome.runtime.sendMessage({ action: "FINISH_USER" });
  }
}

setTimeout(performUnfollow, 4000);