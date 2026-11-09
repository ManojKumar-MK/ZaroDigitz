import { ADMIN_EMAILS, getFirebaseAuth } from './client';

export function isAdminEmail(email) {
  return Boolean(email) && ADMIN_EMAILS.includes(String(email).toLowerCase());
}

export async function signInAdmin(email, password) {
  const { auth, authMod } = await getFirebaseAuth();
  const cred = await authMod.signInWithEmailAndPassword(auth, email.trim(), password);
  if (!isAdminEmail(cred.user.email)) {
    await authMod.signOut(auth);
    throw new Error('This account is not on the admin list.');
  }
  return cred.user;
}

export async function signOutAdmin() {
  const { auth, authMod } = await getFirebaseAuth();
  await authMod.signOut(auth);
}

export async function sendAdminPasswordReset(email) {
  const { auth, authMod } = await getFirebaseAuth();
  await authMod.sendPasswordResetEmail(auth, email.trim());
}

/** cb(user | null). Resolves to an unsubscribe function. */
export async function onAdminAuth(cb) {
  const { auth, authMod } = await getFirebaseAuth();
  return authMod.onAuthStateChanged(auth, (user) => cb(user && isAdminEmail(user.email) ? user : null));
}
