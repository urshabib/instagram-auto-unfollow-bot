let gDelay = 10, iDelay = 6;

// 1. Deciding which view to show & Refreshing Stats
const refreshView = async () => {
  const data = await chrome.storage.local.get(['queue', 'activeUser', 'isRunning', 'history']);
  const setupView = document.getElementById('setupView');
  const runView = document.getElementById('runView');

  if (!data.queue || data.queue.length === 0) {
    setupView.classList.remove('hidden');
    runView.classList.add('hidden');
    return;
  }

  setupView.classList.add('hidden');
  runView.classList.remove('hidden');

  const now = Date.now();
  const history = data.history || [];
  
  // Calculate Rolling Stats
  const lastHour = history.filter(ts => now - ts < 3600000).length;
  const lastDay = history.filter(ts => now - ts < 86400000).length;

  document.getElementById('hourCount').innerText = lastHour;
  document.getElementById('dayCount').innerText = lastDay;
  document.getElementById('remCount').innerText = data.queue.length;
  
  const statusEl = document.getElementById('currentUser');
  if (data.isRunning) {
    statusEl.innerText = data.activeUser || "🚀 Starting...";
    document.getElementById('startBtn').classList.add('hidden');
    document.getElementById('stopBtn').classList.remove('hidden');
  } else {
    statusEl.innerText = "😴 Idle";
    document.getElementById('startBtn').classList.remove('hidden');
    document.getElementById('stopBtn').classList.add('hidden');
  }

  // Color Thresholds
  document.getElementById('hourCount').className = "stat-val " + (lastHour >= 46 ? "color-red" : lastHour >= 28 ? "color-orange" : "color-green");
  document.getElementById('dayCount').className = "stat-val " + (lastDay >= 150 ? "color-red" : lastDay >= 100 ? "color-orange" : "color-green");
};

// Start UI Refresher
refreshView();
setInterval(refreshView, 1000);

// 2. ZIP Processing Logic
const zipInput = document.getElementById('zipInput');
const dropZone = document.getElementById('dropZone');

// --- FIXED DRAG & DROP LOGIC ---
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
  dropZone.addEventListener(eventName, (e) => {
    e.preventDefault();
    e.stopPropagation();
  }, false);
});

dropZone.addEventListener('dragover', () => {
  dropZone.style.borderColor = "#836FFF";
  dropZone.style.background = "rgba(131, 111, 255, 0.1)";
});

dropZone.addEventListener('dragleave', () => {
  dropZone.style.borderColor = "#475569";
  dropZone.style.background = "rgba(15, 23, 42, 0.5)";
});

dropZone.addEventListener('drop', (e) => {
  const dt = e.dataTransfer;
  const file = dt.files[0];
  handleZipFile(file);
});

dropZone.onclick = () => zipInput.click();
zipInput.onchange = (e) => handleZipFile(e.target.files[0]);

async function handleZipFile(file) {
  if (!file || !file.name.endsWith('.zip')) return alert("Please upload a .zip file!");
  
  document.getElementById('initStatus').innerText = "Processing ZIP... 📦";
  
  try {
    const zip = await JSZip.loadAsync(file);
    let followersData = null;
    let followingData = null;

    for (const [path, zipFile] of Object.entries(zip.files)) {
      if (path.includes('followers_1.json')) {
        followersData = JSON.parse(await zipFile.async('text'));
      }
      if (path.includes('following.json')) {
        followingData = JSON.parse(await zipFile.async('text'));
      }
    }

    if (!followersData || !followingData) {
      throw new Error("Could not find followers or following files inside the ZIP.");
    }

    const fSet = new Set(followersData.map(i => i.string_list_data?.[0]?.value?.toLowerCase()));
    const queue = followingData.relationships_following
      .filter(i => i.title && !fSet.has(i.title.toLowerCase()))
      .map(i => `https://www.instagram.com/${i.title}/`);

    await chrome.storage.local.set({ queue: queue, history: [], count: 0 });
    refreshView();
  } catch (err) {
    alert("Error: " + err.message);
    document.getElementById('initStatus').innerText = "Try again.";
  }
}

// 3. Reset Button
document.getElementById('resetBtn').onclick = () => {
  if (confirm("Clear current queue and upload a new ZIP?")) {
    chrome.storage.local.clear(() => window.location.reload());
  }
};

// 4. Speed Selectors
document.querySelectorAll('#globalSpeed .speed-btn').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('#globalSpeed .speed-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    gDelay = parseInt(btn.dataset.v);
  };
});

document.querySelectorAll('#internalSpeed .speed-btn').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('#internalSpeed .speed-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    iDelay = parseInt(btn.dataset.v);
  };
});

// 5. Start / Stop Logic
document.getElementById('startBtn').onclick = () => {
  const limitInput = document.getElementById('limit');
  const limitVal = limitInput ? parseInt(limitInput.value) : 10;
  
  chrome.storage.local.set({ 
    isRunning: true, 
    count: 0, // Reset session count on new start
    limit: isNaN(limitVal) ? 10 : limitVal, 
    delay: gDelay, 
    internalDelay: iDelay,
    keepVerified: document.getElementById('keepVerified').checked,
    keepHigh: document.getElementById('keepHigh').checked,
    highVal: parseInt(document.getElementById('highVal').value) || 10000,
    keepBiz: document.getElementById('keepBiz').checked
  }, () => {
    // Give storage a millisecond to breathe then send message
    setTimeout(() => {
        chrome.runtime.sendMessage({ action: "START_LOOP" });
    }, 100);
  });
};

document.getElementById('stopBtn').onclick = () => {
  chrome.storage.local.set({ isRunning: false, activeUser: "Stopped" });
};