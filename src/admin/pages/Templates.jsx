import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { LuCheck, LuLayers, LuSearch } from 'react-icons/lu';
import { useAdminData } from '../AdminData';
import { loadTemplate } from '../../personalise/templates';
import { CategorySketch } from '../../components/Sketches';
import { PageHeader } from '../ui';

/**
 * Admin → Personalise templates: every design, whether customers can personalise it yet,
 * and a link to set it up (upload the Photoshop JPG and place the boxes).
 */
export default function Templates() {
  const { products } = useAdminData();
  const [templates, setTemplates] = useState({}); // code -> template | null
  const [q, setQ] = useState('');
  const [show, setShow] = useState('all'); // all | ready | todo

  useEffect(() => {
    let gone = false;
    const codes = products.map((p) => p.code).filter(Boolean);
    Promise.all(codes.map(async (code) => [code, await loadTemplate(code)])).then((pairs) => { if (!gone) setTemplates(Object.fromEntries(pairs)); });
    return () => { gone = true; };
  }, [products]);

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return products
      .filter((p) => !term || [p.name, p.code, p.category].some((v) => String(v).toLowerCase().includes(term)))
      .filter((p) => show === 'all' || (show === 'ready' ? templates[p.code] : !templates[p.code]));
  }, [products, q, show, templates]);
  const ready = products.filter((p) => templates[p.code]).length;

  return (
    <div className="space-y-6">
      <PageHeader title="Personalise templates" subtitle={`${ready} of ${products.length} designs can be personalised by customers`} />

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <label className="relative sm:w-80">
          <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search designs" aria-label="Search designs" className="w-full h-10 pl-9 pr-3 rounded-lg bg-white dark:bg-zinc-900 ring-1 ring-zinc-200 dark:ring-zinc-700 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
        </label>
        <div className="inline-flex rounded-lg bg-white dark:bg-zinc-900 ring-1 ring-zinc-200 dark:ring-zinc-700 p-1 text-sm">
          {[['all', 'All'], ['ready', 'Ready'], ['todo', 'Not set up']].map(([v, l]) => (
            <button key={v} type="button" onClick={() => setShow(v)} className={`px-3 h-8 rounded-md font-medium ${show === v ? 'bg-[#2C0A10] text-[#F3DFA2]' : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-900'}`}>{l}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {list.map((p) => {
          const t = templates[p.code];
          return (
            <Link key={p.code} to={`/admin/products/${encodeURIComponent(p.code)}#personalise`} className="group bg-white dark:bg-zinc-900 rounded-xl ring-1 ring-zinc-200 dark:ring-zinc-800 overflow-hidden hover:ring-[#C9A032] transition">
              <div className="aspect-[4/5] bg-[#F3E8D8] dark:bg-zinc-800 text-[#7A1F2B] dark:text-[#E9C766] flex items-center justify-center overflow-hidden">
                {t?.image ? <img src={t.image} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" /> : <CategorySketch category={p.category} className="w-2/3 h-2/3 opacity-70" />}
              </div>
              <div className="p-3">
                <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 line-clamp-2 min-h-[2.5em]">{p.name}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{p.code} · {p.category}</p>
                <p className={`mt-2 inline-flex items-center gap-1.5 text-xs font-semibold ${t ? 'text-emerald-700 dark:text-emerald-400' : 'text-[#7A1F2B] dark:text-[#E9C766]'}`}>
                  {t ? <><LuCheck size={14} /> {t.fields.length} boxes · ready</> : <><LuLayers size={14} /> Set up personalisation</>}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
      {!list.length && <p className="text-sm text-zinc-500">No designs match.</p>}
    </div>
  );
}
