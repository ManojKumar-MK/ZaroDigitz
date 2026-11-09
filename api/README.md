# Zaro Digitz API (digitz-api.zarocrackers.com)

Data API for the Zaro Digitz website: Express 5 + MySQL on Hostinger, with a
Firestore-compatible document store (`docs` table), so the website code keeps the
same data shapes as Zaro Crackers. Separate database from Zaro Crackers.

- Runtime: Node.js 22, Express 5, mysql2. Entry: `server.js`. Schema: `schema.sql`
  (applied automatically at start, idempotent).
- Secrets only in Hostinger hPanel → Websites → digitz-api.zarocrackers.com → Node.js →
  Environment variables: `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`,
  `ALLOWED_ORIGINS` (`https://digitz.zarocrackers.com`), `ADMIN_EMAILS`. Never commit them.
- Admin sign-in: Firebase Auth ID tokens (project `zaro-a083f`), checked in `auth.js`.
- Invoice numbers: `ZD/<financial year>/<number>`, one series per financial year (`invoices.js`).
- Check: `GET https://digitz-api.zarocrackers.com/health` shows the database version and latency.
