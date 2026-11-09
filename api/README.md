# Zaro Digitz API (digitz-api.zarocrackers.com)

Backend API with MySQL, hosted on Hostinger (Business plan, Mumbai). The website
(digitz.zarocrackers.com, GoDaddy) will call it over HTTPS; until the switch-over the live site
keeps using Firebase.

- Runtime: Node.js 22, Express 5, mysql2. Entry: `server.js`. Schema: `schema.sql` (applied
  automatically at start, idempotent).
- Database: `u552284914_zaro` on the same server (`DB_HOST=localhost`).
- Secrets: only in Hostinger hPanel → Websites → digitz-api.zarocrackers.com → Node.js → Environment
  variables (`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DATABASE_URL`, later
  `ADMIN_JWT_SECRET`, Telegram/CallMeBot keys). Never commit them.
- Deploy: from this folder with the Hostinger deploy tool (Node.js, Express, entry `server.js`).
- DNS (GoDaddy, zarocrackers.com): CNAME `api` → `digitz-api.zarocrackers.com.cdn.hstgr.net`.
- Check: `GET https://digitz-api.zarocrackers.com/health` shows the database version and latency.

## Phases
1. Infrastructure, database, schema, health check (this commit).
2. Read APIs: catalog, settings, tracking, invoices; one-time copy of Firestore data.
3. Write APIs: place order, enquiries; admin login and admin APIs.
4. Website switches its data layer (src/firebase/*) to this API behind a flag; test on a
   preview; switch over; keep Firebase as a fallback for a few weeks.
