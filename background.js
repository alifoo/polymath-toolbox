const DEFAULT_SITES = [
  "facebook.com",
  "instagram.com",
  "twitter.com",
  "x.com",
  "tiktok.com",
  "reddit.com",
  "youtube.com",
  "netflix.com",
  "twitch.tv"
];

// Serialize rebuilds — concurrent runs both read empty dynamic rules and
// collide on rule ids. Chain them so each sees the previous result.
let rebuildChain = Promise.resolve();
function rebuildRules() {
  rebuildChain = rebuildChain.then(doRebuild).catch(console.error);
  return rebuildChain;
}

// Build DNR rules from the stored blocklist. Each blocked domain redirects
// main-frame navigations to the local block page.
// After passing a delay countdown, a domain gets this long of unfettered
// access before the delay returns.
const GRACE_MS = 10 * 60 * 1000; // ponytail: fixed window, make configurable if asked

// Drop expired grace entries, return the live map.
async function liveGrace() {
  const { grace = {} } = await chrome.storage.session.get("grace");
  const now = Date.now();
  const live = {};
  for (const [domain, expiry] of Object.entries(grace)) {
    if (expiry > now) live[domain] = expiry;
  }
  return live;
}

async function doRebuild() {
  const {
    sites = [],
    enabled = true,
    redirects = {},
    delays = {}
  } = await chrome.storage.sync.get([
    "sites",
    "enabled",
    "redirects",
    "delays"
  ]);
  const grace = await liveGrace();

  const old = await chrome.declarativeNetRequest.getDynamicRules();
  const removeRuleIds = old.map((r) => r.id);

  const addRules = enabled
    ? sites.map((domain, i) => {
        const condition = {
          urlFilter: "||" + domain + "^",
          resourceTypes: ["main_frame"]
        };

        // In grace window: let the site through.
        if (grace[domain]) {
          return { id: i + 1, priority: 1, action: { type: "allow" }, condition };
        }

        // Half-block: send to countdown page.
        const delay = delays[domain];
        if (delay > 0) {
          return {
            id: i + 1,
            priority: 1,
            action: {
              type: "redirect",
              redirect: {
                extensionPath:
                  "/delay.html?site=" +
                  encodeURIComponent(domain) +
                  "&secs=" +
                  delay
              }
            },
            condition
          };
        }

        // Hard block: custom redirect or message page.
        const target = redirects[domain];
        return {
          id: i + 1,
          priority: 1,
          action: {
            type: "redirect",
            redirect: target
              ? { url: target }
              : {
                  extensionPath:
                    "/blocked.html?site=" + encodeURIComponent(domain)
                }
          },
          condition
        };
      })
    : [];

  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds,
    addRules
  });
}

chrome.runtime.onInstalled.addListener(async () => {
  const stored = await chrome.storage.sync.get(["sites", "enabled"]);
  await chrome.storage.sync.set({
    sites: stored.sites ?? DEFAULT_SITES,
    enabled: stored.enabled ?? true
  });
  await rebuildRules();
});

chrome.runtime.onStartup.addListener(rebuildRules);

chrome.storage.sync.onChanged.addListener((changes) => {
  if (changes.sites || changes.enabled || changes.redirects || changes.delays)
    rebuildRules();
});

// Countdown page asks for access once its timer hits zero.
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type !== "grant" || !msg.domain) return;
  (async () => {
    const grace = await liveGrace();
    grace[msg.domain] = Date.now() + GRACE_MS;
    await chrome.storage.session.set({ grace });
    await rebuildRules();
    chrome.alarms.create("grace:" + msg.domain, { when: grace[msg.domain] });
    sendResponse({ ok: true });
  })();
  return true; // async response
});

// Grace window expired — drop it, delay returns.
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (!alarm.name.startsWith("grace:")) return;
  const domain = alarm.name.slice("grace:".length);
  const grace = await liveGrace();
  delete grace[domain];
  await chrome.storage.session.set({ grace });
  await rebuildRules();
});
