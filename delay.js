const params = new URLSearchParams(location.search);
const domain = params.get("site") || "";
const secs = Math.max(1, parseInt(params.get("secs"), 10) || 5);

document.getElementById("site").textContent = domain;
const countEl = document.getElementById("count");
const goEl = document.getElementById("go");

// Ask the service worker for a grace window, then navigate to the site.
async function open() {
  await chrome.runtime.sendMessage({ type: "grant", domain });
  location.href = "https://" + domain;
}

let remaining = secs;
countEl.textContent = remaining;
const timer = setInterval(() => {
  remaining -= 1;
  if (remaining <= 0) {
    clearInterval(timer);
    countEl.textContent = 0;
    goEl.hidden = false;
    open();
  } else {
    countEl.textContent = remaining;
  }
}, 1000);

goEl.addEventListener("click", open);
