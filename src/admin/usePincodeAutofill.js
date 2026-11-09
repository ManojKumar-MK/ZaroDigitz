import { useEffect, useRef, useState } from 'react';
import { lookupPincode } from '../components/LocationFields';

/** Fills state / district / town from a 6-digit Indian pincode. Returns a status string for a hint. */
export default function usePincodeAutofill(form, setForm) {
  const [status, setStatus] = useState('');
  const last = useRef(String(form.pincode || ''));
  useEffect(() => {
    const pin = String(form.pincode || '').trim();
    if (!/^\d{6}$/.test(pin) || last.current === pin) return undefined;
    last.current = pin;
    const controller = new AbortController();
    setStatus('loading');
    lookupPincode(pin, controller.signal)
      .then((place) => {
        if (!place) { setStatus('none'); return; }
        setForm((prev) => ({ ...prev, state: place.state || prev.state, district: place.district || prev.district, city: place.city || prev.city, country: prev.country || 'India' }));
        setStatus('done');
      })
      .catch((e) => { if (e?.name !== 'AbortError') setStatus('error'); });
    return () => controller.abort();
  }, [form.pincode, setForm]);
  return status;
}

export const pincodeHint = (s) => ({ loading: 'Looking up pincode…', done: 'State, district and town filled from pincode', none: 'Pincode not found; fill manually', error: 'Lookup failed; fill manually' }[s] || '');
