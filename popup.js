const statusEl = document.getElementById("status");
const toggleEl = document.getElementById("toggle");
const countEl = document.getElementById("count");

async function render() {
  const { sites = [], enabled = true } = await chrome.storage.sync.get([
    "sites",
    "enabled"
  ]);
  countEl.textContent = sites.length;
  statusEl.textContent = enabled ? "Blocking on" : "Blocking off";
  toggleEl.textContent = enabled ? "Turn off" : "Turn on";
}

toggleEl.addEventListener("click", async () => {
  const { enabled = true } = await chrome.storage.sync.get("enabled");
  await chrome.storage.sync.set({ enabled: !enabled });
  render();
});

document.getElementById("options").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

render();
