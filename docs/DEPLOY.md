# Deploying Zaro Digitz

| Part | Hostinger website | Notes |
|---|---|---|
| Website + server | `digitz.zarocrackers.com` | Node.js 22, Express, entry `server.js`, build script `build` |
| Data API | `digitz-api.zarocrackers.com` | Node.js 22, Express, entry `api/server.js` (deploy the `api/` folder) |
| Database | `u552284914_digitz` | Created by Hostinger; credentials are in the API site's environment variables |

Both sites are on the same Hostinger account as `api.zarocrackers.com` (order 1010071132).

## One-time setup

1. **DNS (GoDaddy → zarocrackers.com → DNS):** add two CNAME records.

   | Type | Name | Value |
   |---|---|---|
   | CNAME | `digitz` | `digitz.zarocrackers.com.cdn.hstgr.net` |
   | CNAME | `digitz-api` | `digitz-api.zarocrackers.com.cdn.hstgr.net` |

2. **Firebase (admin login):** Firebase Console → project `zaro-a083f` → Authentication →
   Settings → Authorized domains → **Add domain** → `digitz.zarocrackers.com`.

3. **Telegram order alerts:** Hostinger hPanel → Websites → `digitz.zarocrackers.com` →
   Node.js → Environment variables. Add `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` (use a new
   Telegram group for Digitz orders, with the same bot added to it). Then restart the app.

Nothing else is required: the API's defaults allow `https://digitz.zarocrackers.com`, admin
`zarocrackers@gmail.com` and Firebase project `zaro-a083f`. Override them with `ALLOWED_ORIGINS`,
`ADMIN_EMAILS` or `FIREBASE_PROJECT_ID` on the API site if needed.

## Checks

```bash
curl https://digitz-api.zarocrackers.com/health   # "schema": true and the database version
curl -I https://digitz.zarocrackers.com/          # 200
```

Then place a test order on the site, check it in `/admin` → Orders, and delete it.

## Updating

Redeploy the folder to the same Hostinger website (hPanel → Node.js → Redeploy, or the
Hostinger deploy tool). Each deploy replaces the site's files.
