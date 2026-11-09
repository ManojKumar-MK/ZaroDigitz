import { useEffect, useState } from 'react';
import { FiDownload } from 'react-icons/fi';
import { loadPersonalisation } from '../personalise/templates';
import { Card } from './ui';

/** One personalised line: the customer's preview, what they typed, and their photos to download. */
function Personalised({ item }) {
  const [doc, setDoc] = useState(null);
  const [failed, setFailed] = useState(false);
  const token = item.personalisation?.token;
  useEffect(() => {
    let gone = false;
    if (token) loadPersonalisation(token).then((d) => { if (!gone) setDoc(d); }).catch(() => { if (!gone) setFailed(true); });
    return () => { gone = true; };
  }, [token]);
  const summary = item.personalisation?.summary || [];
  return (
    <div className="grid sm:grid-cols-[180px_minmax(0,1fr)] gap-5 py-4">
      <div>
        {doc?.preview ? (
          <a href={doc.preview} download={`${item.code || 'design'}-preview.jpg`} title="Download preview">
            <img src={doc.preview} alt={`Preview of ${item.name}`} className="w-full rounded-lg ring-1 ring-zinc-200" />
          </a>
        ) : (
          <div className="aspect-[3/4] rounded-lg bg-zinc-100 flex items-center justify-center text-xs text-zinc-500 text-center p-3">{failed ? 'Preview could not be loaded' : token ? 'Loading preview…' : 'No preview saved'}</div>
        )}
      </div>
      <div className="min-w-0">
        <p className="font-semibold text-zinc-900">{item.name} <span className="font-normal text-zinc-500">× {item.quantity}</span></p>
        <dl className="mt-2 grid gap-1.5 text-sm">
          {summary.map((s) => (
            <div key={s.label} className="grid grid-cols-[140px_minmax(0,1fr)] gap-3"><dt className="text-zinc-500">{s.label}</dt><dd className="text-zinc-900 whitespace-pre-line break-words">{s.value}</dd></div>
          ))}
        </dl>
        {doc?.photos && Object.keys(doc.photos).length > 0 && (
          <div className="flex flex-wrap gap-3 mt-4">
            {Object.entries(doc.photos).map(([label, src]) => (
              <a key={label} href={src} download={`${item.code || 'design'}-${label}.jpg`} className="group text-xs text-zinc-600">
                <img src={src} alt={label} className="w-20 h-20 object-cover rounded-lg ring-1 ring-zinc-200" />
                <span className="inline-flex items-center gap-1 mt-1 group-hover:text-zinc-900"><FiDownload size={12} /> {label}</span>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Admin → Order: every personalised design in the order, ready to set in Photoshop. */
export default function PersonalisationCard({ items = [] }) {
  const personalised = items.filter((i) => i.personalisation);
  if (!personalised.length) return null;
  return (
    <Card title="Personalised designs">
      <div className="divide-y divide-zinc-100">
        {personalised.map((item, i) => <Personalised key={item.personalisation.token || i} item={item} />)}
      </div>
    </Card>
  );
}
