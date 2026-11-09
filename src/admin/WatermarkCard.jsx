import { useState } from 'react';
import { useAdminData } from './AdminData';
import { saveSettings } from '../firebase/catalog';
import { DEFAULT_WATERMARK } from '../utils/watermark';
import { useToast } from './Toast';
import { Button, Card, Field, inputClass } from './ui';

/** Admin → Settings: the Zaro Digitz watermark added to product photos when they are uploaded. */
export default function WatermarkCard() {
  const toast = useToast();
  const { settings } = useAdminData();
  const [wm, setWm] = useState({ ...DEFAULT_WATERMARK, ...(settings?.watermark || {}) });
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try { await saveSettings({ watermark: wm }); toast('Watermark settings saved'); }
    catch (e) { toast(e.message || 'Could not save', 'error'); }
    finally { setBusy(false); }
  };
  return (
    <Card title="Photo watermark">
      <p className="text-sm text-zinc-600 dark:text-zinc-300 mb-4">Product photos you upload get the Zaro Digitz logo and name in a corner, so a downloaded copy still shows your brand. You can skip it for a single photo when uploading.</p>
      <div className="grid sm:grid-cols-3 gap-4">
        <Field label="Watermark">
          <select className={inputClass} value={wm.enabled ? '1' : ''} onChange={(e) => setWm({ ...wm, enabled: Boolean(e.target.value) })}><option value="1">On for new photos</option><option value="">Off</option></select>
        </Field>
        <Field label="Corner">
          <select className={inputClass} value={wm.position} onChange={(e) => setWm({ ...wm, position: e.target.value })}>
            <option value="bottom-right">Bottom right</option><option value="bottom-left">Bottom left</option><option value="top-right">Top right</option><option value="top-left">Top left</option>
          </select>
        </Field>
        <Field label="Strength">
          <select className={inputClass} value={String(wm.opacity)} onChange={(e) => setWm({ ...wm, opacity: Number(e.target.value) })}>
            <option value="0.4">Light</option><option value="0.6">Medium</option><option value="0.85">Strong</option>
          </select>
        </Field>
      </div>
      <p className="text-xs text-zinc-500 mt-3">Applies to photos uploaded from now on. Photos already saved keep how they are.</p>
      <div className="mt-4"><Button disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save watermark settings'}</Button></div>
    </Card>
  );
}
