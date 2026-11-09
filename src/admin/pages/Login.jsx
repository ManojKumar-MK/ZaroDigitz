import { useState } from 'react';
import { signInAdmin, sendAdminPasswordReset } from '../../firebase/auth';
import { Button, Field, inputClass } from '../ui';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setMsg(null);
    try { await signInAdmin(email, password); }
    catch (err) { setMsg({ type: 'error', text: friendly(err) }); }
    finally { setBusy(false); }
  };

  const reset = async () => {
    if (!email) { setMsg({ type: 'error', text: 'Enter your email first.' }); return; }
    try { await sendAdminPasswordReset(email); setMsg({ type: 'ok', text: 'Password reset email sent.' }); }
    catch (err) { setMsg({ type: 'error', text: friendly(err) }); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark to-gray-900 flex items-center justify-center px-4">
      <form onSubmit={submit} className="w-full max-w-sm bg-white rounded-2xl shadow-2xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <img src="/zaro-logo.png" alt="" className="w-12 h-12 rounded-full border" />
          <div>
            <h1 className="font-semibold text-xl text-zinc-900">Zaro Admin</h1>
            <p className="text-xs text-zinc-500">Orders, products and analytics</p>
          </div>
        </div>
        <div className="space-y-4">
          <Field label="Email">
            <input type="email" autoComplete="username" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <Field label="Password">
            <input type="password" autoComplete="current-password" className={inputClass} value={password} onChange={(e) => setPassword(e.target.value)} required />
          </Field>
          {msg && <p className={`text-sm ${msg.type === 'ok' ? 'text-emerald-600' : 'text-red-600'}`}>{msg.text}</p>}
          <Button type="submit" disabled={busy} className="w-full py-3">{busy ? 'Signing in…' : 'Sign in'}</Button>
          <button type="button" onClick={reset} className="w-full text-xs text-zinc-500 hover:text-primary">Forgot password?</button>
        </div>
      </form>
    </div>
  );
}

function friendly(err) {
  const code = err?.code || '';
  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) return 'Email or password is incorrect.';
  if (code.includes('operation-not-allowed')) return 'Email/Password sign-in is not enabled in Firebase Authentication yet.';
  if (code.includes('too-many-requests')) return 'Too many attempts. Try again in a few minutes.';
  return err?.message || 'Sign-in failed.';
}
