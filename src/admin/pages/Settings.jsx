import { useRef, useState } from 'react';
import { useAdminData } from '../AdminData';
import { saveSettings } from '../../firebase/catalog';
import { loadDemoOrders, removeDemoOrders, importOrders, importCustomers, removeImportedOrders } from '../demo';
import { deleteAllOrderData } from '../../firebase/orders';
import { parseAnyOrderFile, parseCustomersImport, ORDER_CSV_TEMPLATE, CUSTOMER_CSV_TEMPLATE } from '../importers';
import { ADMIN_EMAILS } from '../../firebase/client';
import DataMigrationCard from '../DataMigrationCard';
import InvoiceNumbersCard from '../InvoiceNumbersCard';
import BrandColorsCard from '../BrandColorsCard';
import { Button, Card, Field, inputClass, inr } from '../ui';
import { computeCharges, DEFAULT_CHARGES, DEFAULT_CHARGES_NOTE } from '../../data/charges';
import { BUSINESS, googleBusinessLinks } from '../../seo/site';

export default function Settings() {
  const { settings, orders } = useAdminData();
  const [draft, setDraft] = useState(null); // null = not edited yet, show live settings
  const f = draft ?? settings;
  const setF = setDraft;
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [preview, setPreview] = useState(null);
  const [custPreview, setCustPreview] = useState(null);
  const fileRef = useRef();
  const custFileRef = useRef();
  const importedCount = orders.filter((o) => o.imported).length;
  const downloadText = (name, text) => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv' })); a.download = name; a.click(); URL.revokeObjectURL(a.href); };

  const demoCount = orders.filter((o) => o.demo).length;
  const run = async (fn, ok) => { setBusy(true); setMsg(null); try { const r = await fn(); setMsg({ ok: true, text: typeof ok === 'function' ? ok(r) : ok }); } catch (e) { setMsg({ ok: false, text: e.message || 'Failed' }); } finally { setBusy(false); } };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try { setPreview(parseAnyOrderFile(await file.text())); } catch (ex) { setMsg({ ok: false, text: `Could not parse file: ${ex.message}` }); }
  };
  const onCustomerFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try { setCustPreview(parseCustomersImport(await file.text())); } catch (ex) { setMsg({ ok: false, text: `Could not parse file: ${ex.message}` }); }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">Settings</h1>
        <p className="text-sm text-zinc-500">Store-wide switches. Changes reach the live site within seconds.</p>
      </div>
      {msg && <div className={`rounded-xl px-4 py-3 text-sm ${msg.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{msg.text}</div>}

      <Card title="Storefront">
        <div className="space-y-4">
          <Field label="Catalog-wide discount (%)" hint="Applied to MRP for every product without its own offer price. Current static default is 20.">
            <input type="number" min="0" max="95" className={inputClass} value={f.discountPercent ?? ''} onChange={(e) => setF({ ...f, discountPercent: e.target.value === '' ? null : Number(e.target.value) })} />
          </Field>
          <Field label="Announcement bar text" hint="Leave blank to keep the default wedding-card marquee.">
            <input className={inputClass} value={f.announcement || ''} onChange={(e) => setF({ ...f, announcement: e.target.value })} placeholder="💌 Wedding season offer: free foil on orders above 500 cards" />
          </Field>
          <Field label="Shop WhatsApp number" hint="Country code + number, digits only. The 'Send order on WhatsApp' button after checkout opens this number.">
            <input className={inputClass} value={f.whatsappNumber || ''} onChange={(e) => setF({ ...f, whatsappNumber: e.target.value.replace(/\D/g, '') })} placeholder="919787702336" />
          </Field>
          <Field label="WhatsApp greeting" hint="Prefilled when a visitor taps the floating WhatsApp button or the footer icon. The page they were viewing is added automatically.">
            <textarea className={`${inputClass} min-h-[70px]`} value={f.whatsappGreeting ?? ''} onChange={(e) => setF({ ...f, whatsappGreeting: e.target.value })} />
          </Field>
          <Field label="WhatsApp after an order" hint="The customer always has to press Send in WhatsApp; this only controls how we invite them.">
            <div className="space-y-1.5 text-sm">
              {[['prompt', 'Show the confirmation page, then slide in a WhatsApp prompt after a few seconds (recommended)'], ['auto', 'Open WhatsApp immediately when the order is placed'], ['off', 'Only show the WhatsApp button on the confirmation page']].map(([v, l]) => (
                <label key={v} className="flex items-start gap-2"><input type="radio" name="whatsappAfterOrder" className="mt-1" checked={(f.whatsappAfterOrder || (f.autoOpenWhatsApp === false ? 'off' : 'prompt')) === v} onChange={() => setF({ ...f, whatsappAfterOrder: v })} /> <span>{l}</span></label>
              ))}
            </div>
          </Field>
          <Field label="Google Analytics 4 measurement ID" hint="From analytics.google.com → Admin → Data streams. Looks like G-XXXXXXXXXX. Leave blank to turn analytics off.">
            <input className={inputClass} value={f.ga4Id || ''} onChange={(e) => setF({ ...f, ga4Id: e.target.value.trim().toUpperCase() })} placeholder="G-XXXXXXXXXX" />
          </Field>
          <Field label="Google Maps listing" hint="Used for the map, Get directions, Rate us on Google and review requests. Leave blank to use the Zaro Digitz listing found on Google Maps.">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input className={inputClass} value={f.googlePlaceId || ''} onChange={(e) => setF({ ...f, googlePlaceId: e.target.value.trim() })} placeholder={`Place ID (default ${BUSINESS.googlePlaceId})`} aria-label="Google place ID" />
              <input className={inputClass} value={f.googleCid || ''} onChange={(e) => setF({ ...f, googleCid: e.target.value.replace(/\D/g, '') })} placeholder={`CID (default ${BUSINESS.googleCid})`} aria-label="Google CID" />
            </div>
            <div className="flex flex-wrap gap-3 mt-1.5 text-xs">
              <a className="text-primary hover:underline" href={googleBusinessLinks(f).maps} target="_blank" rel="noopener noreferrer">Check the listing</a>
              <a className="text-primary hover:underline" href={googleBusinessLinks(f).review} target="_blank" rel="noopener noreferrer">Check the review link</a>
            </div>
          </Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.acceptingOrders !== false} onChange={(e) => setF({ ...f, acceptingOrders: e.target.checked })} /> Accepting online orders (unticking shows a notice on checkout)</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.telegramEnabled !== false} onChange={(e) => setF({ ...f, telegramEnabled: e.target.checked })} /> Also send each order to Telegram (existing behaviour)</label>
          <div className="flex justify-end"><Button disabled={busy} onClick={() => run(() => saveSettings({ discountPercent: f.discountPercent, announcement: f.announcement || '', acceptingOrders: f.acceptingOrders !== false, telegramEnabled: f.telegramEnabled !== false, whatsappNumber: String(f.whatsappNumber || '919787702336').replace(/\D/g, ''), whatsappAfterOrder: f.whatsappAfterOrder || (f.autoOpenWhatsApp === false ? 'off' : 'prompt'), whatsappGreeting: (f.whatsappGreeting ?? '').trim(), ga4Id: /^G-[A-Z0-9]+$/.test(f.ga4Id || '') ? f.ga4Id : '', googlePlaceId: f.googlePlaceId || '', googleCid: f.googleCid || '' }), 'Settings saved')}>Save settings</Button></div>
        </div>
      </Card>

      <Card title="Additional charges on every order">
        <p className="text-sm text-zinc-600 mb-4">
          Added on top of the cart subtotal and shown to the customer in the cart, at checkout, on the invoice and in the Telegram order message. Percent charges apply to the subtotal; fixed charges are flat amounts. Example on a ₹10,000 cart: <strong>{inr(computeCharges(10000, f.charges || DEFAULT_CHARGES).total)}</strong> extra.
        </p>
        <div className="space-y-2">
          {(f.charges || []).map((c, i) => (
            <div key={c.id || i} className="grid grid-cols-12 gap-2 items-center">
              <input className={`${inputClass} col-span-6`} value={c.label} placeholder="Label, e.g. Handling & forwarding charges" onChange={(e) => setF({ ...f, charges: f.charges.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} />
              <select className={`${inputClass} col-span-2`} value={c.type} onChange={(e) => setF({ ...f, charges: f.charges.map((x, j) => (j === i ? { ...x, type: e.target.value } : x)) })}>
                <option value="percent">%</option>
                <option value="fixed">₹</option>
              </select>
              <input type="number" min="0" step="0.5" className={`${inputClass} col-span-3`} value={c.value} onChange={(e) => setF({ ...f, charges: f.charges.map((x, j) => (j === i ? { ...x, value: e.target.value === '' ? '' : Number(e.target.value) } : x)) })} />
              <button type="button" aria-label="Remove charge" onClick={() => setF({ ...f, charges: f.charges.filter((_, j) => j !== i) })} className="col-span-1 text-red-500 hover:text-red-700 text-xl leading-none">×</button>
            </div>
          ))}
          <Button variant="secondary" onClick={() => setF({ ...f, charges: [...(f.charges || []), { id: `charge-${Date.now()}`, label: '', type: 'percent', value: 0 }] })}>+ Add charge</Button>
        </div>
        <div className="mt-4">
          <Field label="Note under the totals" hint="Shown in the cart and at checkout.">
            <input className={inputClass} value={f.chargesNote ?? DEFAULT_CHARGES_NOTE} onChange={(e) => setF({ ...f, chargesNote: e.target.value })} />
          </Field>
        </div>
        <div className="flex justify-between items-center mt-4">
          <button type="button" className="text-xs text-zinc-500 hover:text-primary" onClick={() => setF({ ...f, charges: DEFAULT_CHARGES, chargesNote: DEFAULT_CHARGES_NOTE })}>Reset to default (3% handling)</button>
          <Button disabled={busy} onClick={() => run(() => saveSettings({
            charges: (f.charges || []).filter((c) => c.label.trim()).map((c) => ({ id: c.id || c.label.toLowerCase().replace(/[^a-z0-9]+/g, '-'), label: c.label.trim(), type: c.type === 'fixed' ? 'fixed' : 'percent', value: Number(c.value) || 0 })),
            chargesNote: (f.chargesNote ?? DEFAULT_CHARGES_NOTE).trim(),
            showNoteOnInvoice: f.showNoteOnInvoice === true,
          }), 'Charges saved')}>Save charges</Button>
        </div>
      </Card>

      <Card title="Import old orders">
        <div className="text-sm text-zinc-600 space-y-2 mb-4">
          <p><strong>From Telegram (recommended):</strong> on a computer, open Telegram Desktop → the chat where the Zaro order bot posts → ⋮ menu → <em>Export chat history</em> → format <em>JSON</em>, untick media → Export. Upload the <code className="text-xs bg-zinc-100 px-1 rounded">result.json</code> here. Every "New Order" message becomes an order with its date, customer, items and totals.</p>
          <p><strong>From Excel:</strong> fill in the CSV template and upload it. Items are written as <code className="text-xs bg-zinc-100 px-1 rounded">15 cm NANOTECH x2; LADOO x1</code>; product names matching the price list get their code, category and price automatically.</p>
          <button type="button" className="text-primary hover:underline text-sm" onClick={() => downloadText('digitz-orders-template.csv', ORDER_CSV_TEMPLATE)}>Download orders CSV template</button>
        </div>
        <input ref={fileRef} type="file" accept=".csv,.json,text/csv,application/json" onChange={onFile} className="text-sm" />
        {preview && (
          <div className="mt-4 rounded-xl bg-zinc-50 p-4 text-sm">
            <div className="font-semibold text-zinc-900">
              {preview.kind === 'telegram' ? `Telegram export: ${preview.orders.length} orders found in ${preview.scanned} messages` : `${preview.orders.length} orders ready`}
              {preview.errors.length ? `, ${preview.errors.length} rows skipped` : ''}
            </div>
            {preview.errors.slice(0, 5).map((e) => <div key={e} className="text-xs text-red-600">{e}</div>)}
            <ul className="mt-2 text-xs text-zinc-600 space-y-0.5">
              {preview.orders.slice(0, 6).map((o) => <li key={o.orderNumber}>{new Date(o.createdAt).toLocaleDateString('en-IN')} · {o.customer.name} · {o.customer.mobile} · {o.itemCount} items · ₹{o.grandTotal.toLocaleString('en-IN')}</li>)}
              {preview.orders.length > 6 && <li>… {preview.orders.length - 6} more</li>}
            </ul>
            <div className="flex gap-2 mt-3">
              <Button disabled={busy || !preview.orders.length} onClick={() => run(async () => { const n = await importOrders(preview.orders); setPreview(null); if (fileRef.current) fileRef.current.value = ''; return n; }, (n) => `Imported ${n} orders`)}>Import {preview.orders.length} orders</Button>
              <Button variant="secondary" onClick={() => { setPreview(null); if (fileRef.current) fileRef.current.value = ''; }}>Cancel</Button>
            </div>
          </div>
        )}
        {importedCount > 0 && (
          <div className="mt-4 flex items-center justify-between text-xs text-zinc-500">
            <span>{importedCount} imported orders in the database (tagged "imported").</span>
            <button type="button" className="text-red-600 hover:underline" onClick={() => { if (window.confirm(`Delete all ${importedCount} imported orders? Website orders are not affected.`)) run(() => removeImportedOrders(), (n) => `Removed ${n} imported orders`); }}>Remove all imported orders</button>
          </div>
        )}
      </Card>

      <Card title="Import customer list">
        <p className="text-sm text-zinc-600 mb-3">
          A contact list from your phone or an old register. Columns: <code className="text-xs bg-zinc-100 px-1 rounded">name, mobile, email, city, district, state, pincode, address, notes, tags</code>. Customers are matched to orders by mobile number, so re-importing updates instead of duplicating.
          {' '}<button type="button" className="text-primary hover:underline" onClick={() => downloadText('digitz-customers-template.csv', CUSTOMER_CSV_TEMPLATE)}>Download template</button>
        </p>
        <input ref={custFileRef} type="file" accept=".csv,.json,text/csv,application/json" onChange={onCustomerFile} className="text-sm" />
        {custPreview && (
          <div className="mt-4 rounded-xl bg-zinc-50 p-4 text-sm">
            <div className="font-semibold text-zinc-900">{custPreview.customers.length} customers ready{custPreview.errors.length ? `, ${custPreview.errors.length} rows skipped` : ''}</div>
            <ul className="mt-2 text-xs text-zinc-600 space-y-0.5">
              {custPreview.customers.slice(0, 6).map((c) => <li key={c.key}>{c.name} · {c.mobile} · {c.city}</li>)}
            </ul>
            <div className="flex gap-2 mt-3">
              <Button disabled={busy || !custPreview.customers.length} onClick={() => run(async () => { const n = await importCustomers(custPreview.customers); setCustPreview(null); if (custFileRef.current) custFileRef.current.value = ''; return n; }, (n) => `Imported ${n} customers`)}>Import {custPreview.customers.length} customers</Button>
              <Button variant="secondary" onClick={() => { setCustPreview(null); if (custFileRef.current) custFileRef.current.value = ''; }}>Cancel</Button>
            </div>
          </div>
        )}
      </Card>

      <BrandColorsCard />
      <InvoiceNumbersCard />

      <DataMigrationCard />

      <Card title="Developer tools">
        <p className="text-sm text-zinc-600 mb-3">Sample orders are flagged <code className="text-xs bg-zinc-100 px-1 rounded">demo</code> and never mix with real data once removed. {demoCount ? `${demoCount} sample orders are loaded now.` : 'No sample orders loaded.'}</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" disabled={busy} onClick={() => run(() => loadDemoOrders(40), (n) => `Loaded ${n} sample orders`)}>Load 40 sample orders</Button>
          <Button variant="danger" disabled={busy || !demoCount} onClick={() => run(() => removeDemoOrders(), (n) => `Removed ${n} sample orders`)}>Remove sample orders</Button>
        </div>
      </Card>

      <Card title="Danger zone: clear all test data before going live">
        <p className="text-sm text-zinc-600 mb-3">
          Deletes <strong>every</strong> order ({orders.length}), every tracking record and every invoice link in the database. Products, settings and customers are kept. Use this once after testing, before real customers start ordering. There is no undo.
        </p>
        <Button variant="danger" disabled={busy || !orders.length} onClick={() => {
          const typed = window.prompt(`This deletes all ${orders.length} orders permanently. Type DELETE to confirm.`);
          if (typed === 'DELETE') run(() => deleteAllOrderData(), (c) => `Deleted ${c.orders} orders, ${c.tracking} tracking records, ${c.invoices} invoice links`);
        }}>Delete all orders</Button>
        <p className="text-xs text-zinc-400 mt-3">Prefer to keep a few? Open an order and tick "Test order" instead; test orders stay in the list but are hidden from the dashboard and analytics.</p>
      </Card>

      <Card title="Access">
        <p className="text-sm text-zinc-600">Admin emails (from <code className="text-xs bg-zinc-100 px-1 rounded">VITE_ADMIN_EMAILS</code>; must also be listed in <code className="text-xs bg-zinc-100 px-1 rounded">firestore.rules</code>): {ADMIN_EMAILS.join(', ')}</p>
        <p className="text-xs text-zinc-400 mt-2">Add or remove staff in Firebase Console → Authentication, then update both lists and redeploy.</p>
      </Card>
    </div>
  );
}
