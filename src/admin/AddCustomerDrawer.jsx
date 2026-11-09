import { useState } from 'react';
import { FiUserPlus } from 'react-icons/fi';
import { importCustomers } from './demo';
import { useToast } from './Toast';
import usePincodeAutofill, { pincodeHint } from './usePincodeAutofill';
import { Button, Drawer, Field, inputClass } from './ui';

const EMPTY = { name: '', mobile: '', altMobile: '', email: '', address: '', pincode: '', city: '', district: '', state: '', notes: '', tags: '' };

/** Admin → Customers → Add customer. Saved by mobile number (same as imported contacts). */
export default function AddCustomerDrawer({ open, onClose, existing = [] }) {
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const pin = usePincodeAutofill(form, setForm);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const mobile = form.mobile.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
  const dupe = mobile.length === 10 ? existing.find((c) => (c.mobile || '').replace(/\D/g, '').slice(-10) === mobile) : null;

  const save = async () => {
    if (!form.name.trim()) { toast('Enter the customer name', 'warning'); return; }
    if (!/^[6-9]\d{9}$/.test(mobile)) { toast('Enter a 10-digit mobile number', 'warning'); return; }
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) { toast('That email looks wrong', 'warning'); return; }
    setBusy(true);
    try {
      await importCustomers([{
        key: mobile, name: form.name.trim(), mobile, altMobile: form.altMobile.replace(/\D/g, ''), email: form.email.trim(),
        address: form.address.trim(), pincode: form.pincode.trim(), city: form.city.trim(), district: form.district.trim(), state: form.state.trim(),
        notes: form.notes.trim(), tags: form.tags.split(/[,;|]/).map((t) => t.trim()).filter(Boolean), source: 'admin',
      }]);
      toast(dupe ? `${form.name.trim()} updated` : `${form.name.trim()} added`);
      setForm(EMPTY);
      onClose();
    } catch (e) { toast(e.message || 'Could not save', 'error'); } finally { setBusy(false); }
  };

  return (
    <Drawer open={open} onClose={onClose} title="Add customer">
      <div className="space-y-4">
        <Field label="Name *"><input className={inputClass} value={form.name} onChange={set('name')} autoFocus /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Mobile *" hint={dupe ? `Already saved as ${dupe.name}: saving updates that customer.` : undefined}><input className={inputClass} inputMode="tel" value={form.mobile} onChange={set('mobile')} placeholder="10 digits" /></Field>
          <Field label="Alternate mobile"><input className={inputClass} inputMode="tel" value={form.altMobile} onChange={set('altMobile')} /></Field>
        </div>
        <Field label="Email"><input className={inputClass} type="email" value={form.email} onChange={set('email')} /></Field>
        <Field label="Address"><textarea className={`${inputClass} h-auto min-h-[64px] py-2`} value={form.address} onChange={set('address')} placeholder="Door no., street, area" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Pincode" hint={pincodeHint(pin) || undefined}><input className={inputClass} inputMode="numeric" maxLength={6} value={form.pincode} onChange={set('pincode')} /></Field>
          <Field label="Town / City"><input className={inputClass} value={form.city} onChange={set('city')} /></Field>
          <Field label="District"><input className={inputClass} value={form.district} onChange={set('district')} /></Field>
          <Field label="State"><input className={inputClass} value={form.state} onChange={set('state')} /></Field>
        </div>
        <Field label="Notes" hint="Only visible to admins."><textarea className={`${inputClass} h-auto min-h-[64px] py-2`} value={form.notes} onChange={set('notes')} placeholder="e.g. Buys every Diwali, prefers gift boxes" /></Field>
        <Field label="Tags" hint="Separate with commas, e.g. wholesale, regular"><input className={inputClass} value={form.tags} onChange={set('tags')} /></Field>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button icon={FiUserPlus} disabled={busy} onClick={save}>{busy ? 'Saving…' : dupe ? 'Update customer' : 'Add customer'}</Button>
        </div>
      </div>
    </Drawer>
  );
}
