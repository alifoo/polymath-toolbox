const listEl = document.getElementById("list");
const form = document.getElementById("add-form");
const input = document.getElementById("site-input");
const redirectInput = document.getElementById("redirect-input");
const delayInput = document.getElementById("delay-input");

// Strip protocol, www, path — keep bare domain.
function normalize(raw) {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "");
}

// DNR redirect.url needs an absolute URL. Empty stays empty (message page).
function normalizeRedirect(raw) {
  const v = raw.trim();
  if (!v) return "";
  return /^https?:\/\//.test(v) ? v : "https://" + v;
}

async function getState() {
  const {
    sites = [],
    redirects = {},
    delays = {}
  } = await chrome.storage.sync.get(["sites", "redirects", "delays"]);
  return { sites, redirects, delays };
}

async function render() {
  const { sites, redirects, delays } = await getState();
  listEl.replaceChildren();
  for (const domain of sites) {
    const li = document.createElement("li");

    const span = document.createElement("span");
    span.className = "domain";
    span.textContent = domain;

    const redirEl = document.createElement("input");
    redirEl.type = "text";
    redirEl.className = "redirect";
    redirEl.placeholder = "message page";
    redirEl.value = redirects[domain] || "";
    redirEl.addEventListener("change", async () => {
      const state = await getState();
      const target = normalizeRedirect(redirEl.value);
      if (target) state.redirects[domain] = target;
      else delete state.redirects[domain];
      await chrome.storage.sync.set({ redirects: state.redirects });
    });

    const delayEl = document.createElement("input");
    delayEl.type = "number";
    delayEl.min = "0";
    delayEl.className = "delay";
    delayEl.placeholder = "delay s";
    delayEl.value = delays[domain] || "";
    delayEl.addEventListener("change", async () => {
      const state = await getState();
      const secs = parseInt(delayEl.value, 10);
      if (secs > 0) state.delays[domain] = secs;
      else delete state.delays[domain];
      await chrome.storage.sync.set({ delays: state.delays });
    });

    const btn = document.createElement("button");
    btn.className = "secondary";
    btn.textContent = "Remove";
    btn.addEventListener("click", async () => {
      const state = await getState();
      delete state.redirects[domain];
      delete state.delays[domain];
      await chrome.storage.sync.set({
        sites: state.sites.filter((d) => d !== domain),
        redirects: state.redirects,
        delays: state.delays
      });
      render();
    });

    li.append(span, redirEl, delayEl, btn);
    listEl.append(li);
  }
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const domain = normalize(input.value);
  if (!domain) return;
  const { sites, redirects, delays } = await getState();
  const target = normalizeRedirect(redirectInput.value);
  const secs = parseInt(delayInput.value, 10);
  if (target) redirects[domain] = target;
  if (secs > 0) delays[domain] = secs;
  const nextSites = sites.includes(domain) ? sites : [...sites, domain];
  await chrome.storage.sync.set({ sites: nextSites, redirects, delays });
  input.value = "";
  redirectInput.value = "";
  delayInput.value = "";
  render();
});

render();
