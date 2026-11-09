// Post-build: render every route with headless Chrome and save the HTML as dist/<route>.html
// so crawlers and link previews get real content without running JavaScript.
// React still boots on top of the pre-rendered markup and takes over.
//
// Skipped (with a warning) on CI/Netlify where Chrome is absent; fails loudly elsewhere
// because the GoDaddy .htaccess relies on these files existing.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { execFile, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { getRoutes, PRIVATE_ROUTES } from './routes.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const CONCURRENCY = Number(process.env.PRERENDER_CONCURRENCY || Math.min(8, Math.max(2, os.cpus().length)));
const BUDGET_MS = Number(process.env.PRERENDER_BUDGET_MS || 4000);

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
  ].filter(Boolean);
  for (const c of candidates) if (fs.existsSync(c)) return c;
  for (const bin of ['google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser']) {
    try { return execFileSync('which', [bin], { encoding: 'utf8' }).trim(); } catch { /* keep looking */ }
  }
  return null;
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf', '.xml': 'application/xml', '.txt': 'text/plain', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
};

function startServer(indexHtml) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      const file = path.join(dist, pathname);
      if (pathname !== '/' && file.startsWith(dist) && fs.existsSync(file) && fs.statSync(file).isFile()) {
        res.writeHead(200, { 'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream' });
        fs.createReadStream(file).pipe(res);
        return;
      }
      res.writeHead(200, { 'Content-Type': MIME['.html'] });
      res.end(indexHtml);
    });
    server.listen(0, '127.0.0.1', () => resolve({ server, port: server.address().port }));
  });
}

function renderRoute(chrome, port, route, idx) {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), `digitz-prerender-${idx}-`));
  const args = [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
    `--user-data-dir=${profile}`, `--virtual-time-budget=${BUDGET_MS}`, '--dump-dom', `http://127.0.0.1:${port}${route}`,
  ];
  return new Promise((resolve) => {
    execFile(chrome, args, { maxBuffer: 64 * 1024 * 1024, encoding: 'utf8' }, (err, stdout) => {
      fs.rmSync(profile, { recursive: true, force: true });
      resolve({ err, html: stdout });
    });
  });
}

function outputFile(route) {
  return route === '/' ? path.join(dist, 'index.html') : path.join(dist, `${route.replace(/^\//, '')}.html`);
}

async function main() {
  if (!fs.existsSync(path.join(dist, 'index.html'))) throw new Error('dist/index.html not found; run vite build first');
  const chrome = findChrome();
  if (!chrome) {
    // Hosting builders (GoDaddy Node.js, Netlify) have no Chrome. The app still works:
    // server.js falls back to index.html for every route, so never fail the build here.
    // Set PRERENDER_REQUIRED=1 to make a missing browser fatal (e.g. in CI).
    const msg = 'No Chrome/Chromium found; skipping pre-render (routes will be client-rendered only).';
    if (process.env.PRERENDER_REQUIRED === '1') throw new Error(`[prerender] ${msg} Set CHROME_PATH or install Google Chrome.`);
    console.warn(`[prerender] ${msg}`);
    return;
  }
  const indexHtml = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
  // Keep the un-rendered shell: the server writes per-URL head tags into it for routes
  // that have no pre-rendered file (e.g. products added later in the admin).
  fs.writeFileSync(path.join(dist, '_shell.html'), indexHtml);
  const routes = [...getRoutes().map((r) => r.path), ...PRIVATE_ROUTES];
  const { server, port } = await startServer(indexHtml);
  console.log(`[prerender] ${routes.length} routes with ${path.basename(chrome)} (concurrency ${CONCURRENCY})`);

  let next = 0, ok = 0, failed = [];
  const started = Date.now();
  async function worker(id) {
    while (next < routes.length) {
      const route = routes[next++];
      const { err, html } = await renderRoute(chrome, port, route, id);
      const hasRoot = /<div id="root">\s*<[a-z]/i.test(html);
      if (err || !hasRoot) {
        if (failed.length === 0) {
          console.warn(`[prerender] first failure on ${route}: ${err ? err.message.split('\n')[0] : 'no rendered root'}; html length ${html.length}`);
          if (!err && html) console.warn(`[prerender] html head: ${html.slice(0, 300).replace(/\s+/g, ' ')}`);
        }
        failed.push(route);
        continue;
      }
      let out = html.trim();
      if (!/^<!doctype html>/i.test(out)) out = `<!doctype html>\n${out}`;
      const file = outputFile(route);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, out);
      ok++;
      if (ok % 25 === 0) console.log(`[prerender] ${ok}/${routes.length}`);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, (_, i) => worker(i)));
  server.close();
  console.log(`[prerender] done: ${ok} rendered, ${failed.length} failed in ${((Date.now() - started) / 1000).toFixed(0)}s`);
  if (failed.length) {
    console.warn('[prerender] failed routes:', failed.join(', '));
    if (failed.length > routes.length * 0.1) throw new Error('[prerender] too many failures');
  }
}

main().catch((e) => { console.error(e.message || e); process.exit(1); });
