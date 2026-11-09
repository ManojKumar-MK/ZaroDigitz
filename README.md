# Zaro Digitz

Website and admin panel for **Zaro Digitz**, wedding cards and printing from Sivakasi
(https://digitz.zarocrackers.com). Started as a copy of the Zaro Crackers site; the two
share no data.

- `src/` is the React storefront plus the admin panel at `/admin` (Vite, Tailwind, framer-motion).
- `server.js` and `server/` are the Express website server: SEO pages, sitemap, `/api/catalog`, and the Telegram order alert, which also saves each order.
- `api/` is the data API (`digitz-api.zarocrackers.com`): Express + MySQL with a Firestore-compatible document store.

## Run locally

```bash
npm install && (cd api && npm install)
npm run dev        # website on http://localhost:4173, server on :3001
```

Point the site at a local API with `VITE_DATA_API_URL` / `DATA_API_URL`.

## Deploy

See [docs/DEPLOY.md](docs/DEPLOY.md).
