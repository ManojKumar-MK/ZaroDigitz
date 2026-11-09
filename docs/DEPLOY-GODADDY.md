# Deploying Zaro Crackers on GoDaddy Node.js Hosting

Production (`https://www.zarocrackers.com`) runs on GoDaddy **Node.js Hosting**, app
name **ZaroCrackers** (dashboard: `host.godaddy.com/nodejs/projects/<id>`). It runs
`npm start` → `node server.js`, which serves the built site from `dist/` and the
Telegram order bridge. The code lives in GitHub at `Roshan1106/ZaroCrackers`, branch `main`.

Goal of this guide: connect the app to GitHub once so every push to `main` deploys by
itself, then publish the current build and verify it.

---

## How GoDaddy deploys this app (confirmed from the dashboard)

The app is already connected to GitHub (`Roshan1106/ZaroCrackers`, branch `main`, Node.js 22).
GoDaddy deploys in **two steps**: it pulls `main` into a **Preview** app, and you then
**Publish to Live**. When `main` is ahead of the preview, Overview shows the yellow notice
“Preview is out of sync with GitHub”.

## Part A — publish the latest code (every time there is new code)

1. **ZaroCrackers → Overview.**
2. Click **Update Preview**. GoDaddy pulls `main` and builds. Watch **Activities** / **Logs**;
   “Build status: Healthy” means it finished. Expected log lines:
   - `Wrote 206 product images …`, `Wrote 25x URLs to public/sitemap.xml`
   - `vite v8 … ✓ built in …`
   - `[prerender] No Chrome/Chromium found; skipping pre-render` ← **normal** on GoDaddy
3. Click the **Preview** badge to open the preview app. The title must read
   “Zaro Crackers | Sivakasi Crackers Online at Wholesale Prices”.
4. Click **Publish to Live**. After a minute, `https://www.zarocrackers.com` serves the new build.
5. Optional: **Settings** → look for an “automatic deploy / auto-publish on push” switch and turn
   it on so steps 2–4 happen by themselves on every push. If there is none, repeat Part A when told
   that new code is on `main`.

## Part B — environment variables (once)

**Settings → Environment variables** (or Quick Actions → **Manage Secrets**):

| Name | Value | Notes |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | (already set) | keep |
| `TELEGRAM_CHAT_ID` | (already set) | keep; comma-separate several chat ids |
| `CANONICAL_HOST` | `www.zarocrackers.com` | forces https + www |
| `CALLMEBOT_RECIPIENTS` | `917010935230:APIKEY` | optional WhatsApp self-alert (see below) |

Do **not** set `PORT` (GoDaddy provides it). Changing variables needs **Restart Published App**
(Quick Actions) or a new publish.

## Part C — verify the live site (2 minutes)

Open each of these; all should work:

| URL | Expect |
|---|---|
| https://www.zarocrackers.com | new title “Zaro Crackers \| Sivakasi Crackers Online at Wholesale Prices” |
| https://www.zarocrackers.com/robots.txt | plain text starting `User-agent: *` |
| https://www.zarocrackers.com/sitemap.xml | XML with ~250 URLs |
| https://www.zarocrackers.com/crackers/10-cm-sparklers | category page loads directly |
| https://www.zarocrackers.com/track | “Track Your Order” page |
| https://www.zarocrackers.com/admin | admin login |
| https://zarocrackers.com/ | redirects to `https://www.zarocrackers.com/` |
| https://www.zarocrackers.com/some-random-page | “Page not found” (a real 404) |

Then place one small test order on the live site and confirm: Telegram message arrives,
the order appears in `/admin`, the invoice link and tracking link in the confirmation work.
Finally **Admin → Settings → Danger zone → Delete all orders** to clear test data before
real customers arrive.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Build fails at `npm ci` with “lock file out of sync” | Use `npm install` as the install command (platform-only optional packages are not in the lock file). |
| Build fails at `postbuild` / prerender | Should only warn. If it errors, set env `PRERENDER_REQUIRED=0` (any value other than `1`) and redeploy. |
| Site shows old content after deploy | Hard-refresh (Ctrl/Cmd+Shift+R); Cloudflare caches HTML for a short time. |
| `/track` or `/invoice/...` show the home page | The old build is still live — the deploy did not publish. Check Activities. |
| Telegram not received | `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` missing in environment variables; test with `https://www.zarocrackers.com/api/health` (should return `{"ok":true}`). |
| 403 from Cloudflare | Temporary; retry. If persistent, check the domain still points at the Node.js app under Domains. |

## Optional: WhatsApp alert to the owner's phone (CallMeBot)

1. Save **+34 644 27 31 86** as a contact; send it the WhatsApp message `I allow callmebot to send me messages`.
2. It replies with an API key. Set `CALLMEBOT_RECIPIENTS=917010935230:THATKEY` (comma-separate for more phones) and redeploy.

---

## After the deploy: SEO checklist (owner tasks)

1. **Google Search Console** — https://search.google.com/search-console → Add property → **Domain** `zarocrackers.com` → copy the TXT record → GoDaddy → Domains → zarocrackers.com → DNS → add TXT on `@` → Verify. Then **Sitemaps** → submit `https://www.zarocrackers.com/sitemap.xml`. **URL Inspection** → request indexing for `/`, `/price-list` and 2–3 category pages.
2. **Google Business Profile** — https://business.google.com → create “Zaro Crackers”, Sivakasi to Sattur Bypass Road, Sivakasi 626189, phone, hours, website, photos. Verify with the code Google sends. Collect reviews.
3. **Local listings** — Justdial, IndiaMART, Sulekha with the same name/address/phone and the website link.
4. **Google Analytics 4** — create a property, send the `G-XXXXXXX` ID to be added to the site, link it to Search Console.
5. **Bing Webmaster Tools** — import from Search Console, submit the same sitemap.
6. **After 2 weeks** — review Search Console → Performance for the first keywords and pages.
