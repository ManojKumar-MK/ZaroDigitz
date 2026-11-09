import { useEffect, useRef, useState } from 'react';

// Lightweight replacement for the world-wide country/state/city dataset (9 MB) that
// used to ship with the checkout. Orders are shipped within India, so: India by
// default with every state and union territory listed, free-text for others,
// and the pincode auto-fills state, district and town via India Post's public API.

export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh',
  'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha',
  'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
];

const COUNTRIES = ['India', 'Other'];

const inputClass = (hasError) =>
  `w-full px-4 py-3   text-sm focus:outline-none  transition-colors ${hasError ? ' bg-red-50' : ' bg-paper2'}`;

/** Looks up an Indian pincode. Resolves { state, district, city } or null. */
export async function lookupPincode(pincode, signal) {
  const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`, { signal });
  const json = await response.json();
  const offices = json?.[0]?.Status === 'Success' ? json[0].PostOffice || [] : [];
  if (!offices.length) return null;
  const main = offices.find((o) => o.BranchType === 'Head Post Office') || offices.find((o) => o.BranchType === 'Sub Post Office') || offices[0];
  const city = main.Block && main.Block !== 'NA' ? main.Block : main.Division || main.District;
  return { state: main.State || '', district: main.District || '', city: city || '' };
}

export default function LocationFields({ form, setForm, errors, setErrors }) {
  const [lookup, setLookup] = useState({ status: 'idle', pincode: '' }); // idle | loading | done | none | error
  const lastLooked = useRef('');
  const isIndia = !form.country || form.country === 'India';

  const clearError = (...fields) =>
    setErrors((prev) => {
      const next = { ...prev };
      fields.forEach((f) => { if (next[f]) next[f] = ''; });
      return next;
    });

  // Default the country to India so the state dropdown is ready immediately.
  useEffect(() => {
    if (!form.country) setForm((prev) => (prev.country ? prev : { ...prev, country: 'India' }));
  }, [form.country, setForm]);

  // Pincode -> state / district / town, once per 6-digit value.
  useEffect(() => {
    const pin = String(form.pincode || '').trim();
    if (!isIndia || !/^\d{6}$/.test(pin) || lastLooked.current === pin) return undefined;
    lastLooked.current = pin;
    const controller = new AbortController();
    setLookup({ status: 'loading', pincode: pin });
    lookupPincode(pin, controller.signal)
      .then((place) => {
        if (controller.signal.aborted) return;
        if (!place) { setLookup({ status: 'none', pincode: pin }); return; }
        setForm((prev) => ({
          ...prev,
          state: place.state || prev.state,
          district: place.district || prev.district,
          city: prev.city?.trim() ? prev.city : place.city,
        }));
        clearError('state', 'district', 'city');
        setLookup({ status: 'done', pincode: pin });
      })
      .catch((err) => { if (err?.name !== 'AbortError') setLookup({ status: 'error', pincode: pin }); });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.pincode, isIndia]);

  return (
    <>
      <div className="sm:col-span-2">
        <label className="block text-sm font-semibold text-dark mb-2">Country *</label>
        <select
          value={COUNTRIES.includes(form.country) ? form.country : form.country ? 'Other' : 'India'}
          onChange={(e) => { setForm((prev) => ({ ...prev, country: e.target.value === 'Other' ? '' : e.target.value, state: '', district: '' })); clearError('country', 'state', 'district'); }}
          className={inputClass(errors.country)}
        >
          {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        {!isIndia && (
          <input
            type="text"
            value={form.country}
            onChange={(e) => { setForm((prev) => ({ ...prev, country: e.target.value })); clearError('country'); }}
            placeholder="Country name"
            className={`${inputClass(errors.country)} mt-2`}
          />
        )}
        {errors.country && <p className="text-red-500 text-xs mt-1">{errors.country}</p>}
        {isIndia && lookup.status === 'loading' && <p className="text-xs text-gray-500 mt-1">Looking up pincode {lookup.pincode}…</p>}
        {isIndia && lookup.status === 'done' && <p className="text-xs text-emerald-600 mt-1">State and district filled from pincode {lookup.pincode}. Please check them.</p>}
        {isIndia && lookup.status === 'none' && <p className="text-xs text-amber-600 mt-1">Pincode {lookup.pincode} not found. Please fill the state and district yourself.</p>}
      </div>

      <div>
        <label className="block text-sm font-semibold text-dark mb-2">State *</label>
        {isIndia ? (
          <select
            value={INDIAN_STATES.includes(form.state) ? form.state : ''}
            onChange={(e) => { setForm((prev) => ({ ...prev, state: e.target.value })); clearError('state'); }}
            className={inputClass(errors.state)}
          >
            <option value="">Select state</option>
            {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        ) : (
          <input type="text" value={form.state} onChange={(e) => { setForm((prev) => ({ ...prev, state: e.target.value })); clearError('state'); }} placeholder="State / province" className={inputClass(errors.state)} />
        )}
        {errors.state && <p className="text-red-500 text-xs mt-1">{errors.state}</p>}
      </div>

      <div>
        <label className="block text-sm font-semibold text-dark mb-2">District *</label>
        <input
          type="text"
          value={form.district}
          onChange={(e) => { setForm((prev) => ({ ...prev, district: e.target.value })); clearError('district'); }}
          placeholder="District"
          autoComplete="address-level2"
          className={inputClass(errors.district)}
        />
        {errors.district && <p className="text-red-500 text-xs mt-1">{errors.district}</p>}
      </div>
    </>
  );
}
