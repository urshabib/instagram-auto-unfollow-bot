async function performUnfollow() {
  const data = await chrome.storage.local.get(['isRunning', 'internalDelay']);
  if (!data.isRunning) return;
  const findEl = (t) => Array.from(document.querySelectorAll('button, span, div[role="button"]')).find(el => t.some(txt => el.innerText.trim().includes(txt)));

  const followBtn = findEl(["Following", "Abonné(e)"]);
  if (followBtn) {
    followBtn.click();
    setTimeout(() => {
      const unfollowRow = findEl(["Unfollow", "Se désabonner"]);
      if (unfollowRow) { 
        unfollowRow.click(); 
        setTimeout(() => chrome.runtime.sendMessage({ action: "FINISH_USER" }), 1500); 
      }
      else chrome.runtime.sendMessage({ action: "FINISH_USER" });
    }, (data.internalDelay || 6) * 1000);
  } else chrome.runtime.sendMessage({ action: "FINISH_USER" });
}
setTimeout(performUnfollow, 4000);