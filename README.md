# Polymath Toolbox

A Chrome extension that blocks time-consuming websites so you can focus on
becoming a polymath. Old-book "scroll" aesthetic — cream background, black ink.

## Features

- **Hard block** — blocked sites redirect to a message page (or a custom URL you choose).
- **Half block (delay)** — set a per-site countdown. After it ends you get a
  10-minute grace window before the delay returns. Off by default.
- **Custom redirect** — send a blocked site somewhere useful instead of the message page.
- **Toggle** — turn all blocking on/off from the popup.
- **Editable blocklist** — add/remove domains in the options page. Settings sync
  across your Chrome profile.

Default blocklist: facebook, instagram, twitter/x, tiktok, reddit, youtube,
netflix, twitch.

## Install (unpacked)

1. Open `chrome://extensions`
2. Enable **Developer mode** (top right)
3. **Load unpacked** → select this folder

## How it works

Blocking uses the `declarativeNetRequest` API — main-frame navigations to a
listed domain match a dynamic rule:

- in grace window → `allow`
- delay set → redirect to `delay.html` (countdown → grants grace via the service worker → opens the site)
- otherwise → redirect to `blocked.html` or your custom URL

Rules are rebuilt whenever settings change, serialized so concurrent rebuilds
don't collide on rule ids. Grace windows live in `chrome.storage.session` and
expire via `chrome.alarms`.

## Files

| File | Role |
|------|------|
| `manifest.json` | MV3 manifest, permissions |
| `background.js` | Service worker — builds DNR rules, manages grace windows |
| `blocked.html` / `blocked.js` | Hard-block message page |
| `delay.html` / `delay.js` | Half-block countdown page |
| `popup.html` / `popup.js` | Toolbar toggle + count |
| `options.html` / `options.js` | Blocklist editor |
| `style.css` | Shared scroll-color theme |

## Settings model

Stored in `chrome.storage.sync`:

- `sites` — array of blocked domains
- `enabled` — master on/off
- `redirects` — `{ domain: url }` custom redirect targets
- `delays` — `{ domain: seconds }` half-block countdowns

## Known limitations

- After a delay countdown you land on the site's homepage, not the original deep link.
- Redirecting a blocked site to another blocked site can bounce (no loop guard).
- Grace window is a fixed 10 minutes (`GRACE_MS` in `background.js`).
