// Firebase bootstrap. Everything is optional: when the VITE_FIREBASE_* variables are
// absent the site behaves exactly as before (static catalog, Telegram-only orders).
// The SDK is loaded lazily so the storefront bundle does not pay for it up front.

const env = import.meta.env ?? {}; // undefined under plain Node (scripts/tests)

const config = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

export const isFirebaseEnabled = Boolean(config.apiKey && config.projectId && config.appId);
export const useEmulators = env.VITE_FIREBASE_USE_EMULATOR === '1';

/** Emails allowed into /admin (UI gate only; firestore.rules is the real guard). */
export const ADMIN_EMAILS = String(env.VITE_ADMIN_EMAILS || 'zarocrackers@gmail.com')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

/**
 * Where the shop's data lives: 'api' = MySQL on Hostinger via digitz-api.zarocrackers.com,
 * 'firebase' = Cloud Firestore. Sign-in always uses Firebase Authentication.
 * Change DEFAULT_DATA_BACKEND (or set VITE_DATA_BACKEND) and rebuild to switch.
 */
const DEFAULT_DATA_BACKEND = 'api';
export const DATA_BACKEND = env.VITE_DATA_BACKEND || DEFAULT_DATA_BACKEND;

let bootPromise = null;
let nativePromise = null;
let authPromise = null;

/**
 * Resolves to { app, db, fs } where `fs` is the firebase/firestore module namespace
 * (so callers can use collection(), onSnapshot() etc. without importing the SDK).
 * Firebase Auth is not loaded here: the storefront never needs it.
 */
export function getFirebase() {
  if (!isFirebaseEnabled) return Promise.reject(new Error('Firebase is not configured'));
  if (DATA_BACKEND === 'api') {
    if (!bootPromise) bootPromise = import('./apiStore.js').then((m) => ({ app: null, db: m.db, fs: m.apiFs }));
    return bootPromise;
  }
  return getFirestoreNative();
}

/** Cloud Firestore itself (also used by the one-time copy to Hostinger in Admin → Settings). */
export function getFirestoreNative() {
  if (!isFirebaseEnabled) return Promise.reject(new Error('Firebase is not configured'));
  if (!nativePromise) {
    nativePromise = Promise.all([import('firebase/app'), import('firebase/firestore')]).then(([appMod, fs]) => {
      const app = appMod.getApps().length ? appMod.getApp() : appMod.initializeApp(config);
      // Keep a copy in the browser (IndexedDB, shared by all tabs): re-opening the admin or a
      // page re-reads only documents that changed, which keeps Firestore reads low.
      // Admin only: storefront tabs (checkout, tracking) stay independent, so an order never
      // waits on another tab, and the storefront gets its catalog from the server anyway.
      const isAdmin = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');
      let db;
      try {
        db = isAdmin
          ? fs.initializeFirestore(app, { localCache: fs.persistentLocalCache({ tabManager: fs.persistentMultipleTabManager() }) })
          : fs.getFirestore(app);
      } catch {
        db = fs.getFirestore(app); // already initialised, or no IndexedDB (private mode)
      }
      if (useEmulators) fs.connectFirestoreEmulator(db, '127.0.0.1', 8080);
      return { app, db, fs };
    });
  }
  return nativePromise;
}

async function firebaseApp() {
  const appMod = await import('firebase/app');
  return appMod.getApps().length ? appMod.getApp() : appMod.initializeApp(config);
}

/** Firebase Auth for the admin panel: resolves to { app, db, fs, auth, authMod }. */
export function getFirebaseAuth() {
  if (!authPromise) {
    authPromise = Promise.all([getFirebase(), import('firebase/auth'), firebaseApp()]).then(async ([base, authMod, app]) => {
      const auth = authMod.getAuth(app);
      if (useEmulators) authMod.connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
      // The API identifies the admin by this Firebase ID token.
      const { setTokenProvider } = await import('./apiStore.js');
      setTokenProvider(async () => (auth.currentUser ? auth.currentUser.getIdToken() : null));
      return { ...base, app, auth, authMod };
    });
  }
  return authPromise;
}

/** Firestore Timestamp | Date | string | number -> Date (or null). */
export function toDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === 'function') return value.toDate();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}
