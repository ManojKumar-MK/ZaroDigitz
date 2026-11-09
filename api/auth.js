// Admin sign-in stays on Firebase Authentication (free, no database reads). The website
// sends the signed-in admin's Firebase ID token; we verify Google's signature here.
import crypto from 'node:crypto';

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'zaro-a083f';
const ADMIN_EMAILS = String(process.env.ADMIN_EMAILS || 'zarocrackers@gmail.com').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
const CERTS_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
// Local tests only: accept unsigned tokens from the Firebase Auth emulator.
const EMULATOR = process.env.AUTH_EMULATOR === '1';

let certs = { at: 0, maxAge: 0, keys: {} };
async function getCerts() {
  if (Date.now() - certs.at < certs.maxAge * 1000) return certs.keys;
  const r = await fetch(CERTS_URL);
  if (!r.ok) throw new Error(`certs ${r.status}`);
  const maxAge = Number(/max-age=(\d+)/.exec(r.headers.get('cache-control') || '')?.[1] || 3600);
  certs = { at: Date.now(), maxAge, keys: await r.json() };
  return certs.keys;
}

const b64json = (s) => JSON.parse(Buffer.from(s, 'base64url').toString('utf8'));

/** Returns the verified token payload, or null. */
export async function verifyIdToken(token) {
  try {
    const [h, p, sig] = String(token || '').split('.');
    if (!h || !p) return null;
    const header = b64json(h);
    const payload = b64json(p);
    const now = Math.floor(Date.now() / 1000);
    if (EMULATOR && header.alg === 'none') return payload; // emulator: no signature
    if (header.alg !== 'RS256' || !header.kid) return null;
    if (payload.aud !== PROJECT_ID || payload.iss !== `https://securetoken.google.com/${PROJECT_ID}`) return null;
    if (!payload.sub || payload.exp <= now || payload.iat > now + 300) return null;
    const cert = (await getCerts())[header.kid];
    if (!cert) return null;
    const ok = crypto.createVerify('RSA-SHA256').update(`${h}.${p}`).verify(cert, Buffer.from(sig, 'base64url'));
    return ok ? payload : null;
  } catch {
    return null;
  }
}

/** Express middleware: sets req.auth = { uid, email, admin } when a valid token is sent. */
export async function authenticate(req, _res, next) {
  const m = /^Bearer (.+)$/.exec(req.headers.authorization || '');
  req.auth = null;
  if (m) {
    const payload = await verifyIdToken(m[1]);
    if (payload) {
      const email = String(payload.email || '').toLowerCase();
      req.auth = { uid: payload.sub || payload.user_id, email, admin: Boolean(email) && ADMIN_EMAILS.includes(email) };
    }
  }
  next();
}
