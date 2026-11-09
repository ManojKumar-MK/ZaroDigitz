import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FiActivity, FiAlertTriangle, FiCheckCircle, FiXCircle, FiExternalLink, FiRefreshCw, FiSearch, FiUploadCloud, FiFileText, FiCheckSquare, FiEdit2, FiInfo, FiChevronDown, FiChevronRight } from 'react-icons/fi';
import { useAdminData } from '../AdminData';
import { useToast } from '../Toast';
import { mergeForAdmin } from '../catalogAdmin';
import { upsertProduct, saveSettings } from '../../firebase/catalog';
import { buildSeoPages, groupIssues, healthScore, siteChecks, inspectLive, publishSeo, toolLinks, KIND_LABEL } from '../seoAudit';
import { GooglePreview, WhatsAppPreview, SeoFields } from '../SeoEditor';
import SearchConsolePanel from '../SearchConsolePanel';
import { fullTitle } from '../../seo/pages';
import { absoluteUrl, safeUrl, googleBusinessLinks } from '../../seo/site';
import { Thumb } from '../ProductPicker';
import { Button, Card, Drawer, Empty, PageHeader, Stat, Tabs, Toggle, inputClass, fmtDateTime } from '../ui';

const LEVEL = {
  error: { icon: FiXCircle, cls: 'text-red-600', dot: 'bg-red-500', label: 'Must fix' },
  warning: { icon: FiAlertTriangle, cls: 'text-amber-600', dot: 'bg-amber-500', label: 'Should fix' },
  info: { icon: FiInfo, cls: 'text-sky-600', dot: 'bg-sky-500', label: 'Nice to fix' },
  ok: { icon: FiCheckCircle, cls: 'text-emerald-600', dot: 'bg-emerald-500', label: 'Good' },
};

const SETUP = [
  { key: 'searchConsole', label: 'Verify the site in Google Search Console', detail: 'Add a Domain property for zarocrackers.com and put the TXT record in GoDaddy DNS.', href: 'https://search.google.com/search-console' },
  { key: 'sitemapSubmitted', label: 'Submit the sitemap in Search Console', detail: 'Sitemaps → enter sitemap.xml → Submit.', href: 'https://search.google.com/search-console/sitemaps?resource_id=sc-domain%3Azarocrackers.com' },
  { key: 'businessProfile', label: 'Create and verify the Google Business Profile', detail: 'Name exactly “Zaro Digitz”, category Wedding invitation printer, the shop address and phone.', href: 'https://business.google.com' },
  { key: 'mapsListing', label: 'Complete the Google Maps listing', detail: 'Today it shows category “Store”, no phone, hours, website or photos. In Business Profile set category Wedding invitation printer, phone +91 70109 35230, hours, website https://digitz.zarocrackers.com, 10+ photos, and the same address as the website.', href: 'https://business.google.com/locations' },
  { key: 'ga4', label: 'Connect Google Analytics 4', detail: 'Paste the G- measurement ID in Settings.', to: '/admin/settings', auto: (s) => Boolean(s.ga4Id) },
  { key: 'bing', label: 'Add the site to Bing Webmaster Tools', detail: 'Import from Search Console in one click.', href: 'https://www.bing.com/webmasters' },
  { key: 'listings', label: 'List the shop on Justdial, IndiaMART, Facebook and Instagram', detail: 'Use the same name, address, phone and website everywhere.', href: 'https://www.justdial.com/Free-Listing' },
  { key: 'reviews', label: 'Collect 20 Google reviews', detail: 'On a delivered order press “Ask for review” to send the review link on WhatsApp. Delivered customers also see “Rate us on Google” on the tracking page.', href: googleBusinessLinks().reviews },
  { key: 'indexed', label: 'Check the shop appears in Google', detail: 'Search site:zarocrackers.com. Listed pages are indexed.', href: 'https://www.google.com/search?q=site%3Azarocrackers.com' },
];

const scoreTone = (n) => (n >= 85 ? 'text-emerald-600' : n >= 60 ? 'text-amber-600' : 'text-red-600');

export default function SeoDashboard() {
  const { products, productsLoading, settings } = useAdminData();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'overview';
  const setParam = (k, v) => { const n = new URLSearchParams(params); if (!v || v === 'all') n.delete(k); else n.set(k, v); setParams(n, { replace: true }); };
  const [editing, setEditing] = useState(null); // page key
  const [live, setLive] = useState(null);
  const [checking, setChecking] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const pages = useMemo(() => buildSeoPages(mergeForAdmin(products), settings), [products, settings]);
  const groups = useMemo(() => groupIssues(pages), [pages]);
  const productCount = pages.filter((p) => p.kind === 'product').length;

  const runChecks = useCallback(() => {
    setChecking(true);
    siteChecks(productCount).then(setLive).catch(() => setLive(null)).finally(() => setChecking(false));
  }, [productCount]);
  // First check once the catalog is known (the result arrives asynchronously).
  useEffect(() => {
    if (productsLoading) return undefined;
    let gone = false;
    siteChecks(productCount).then((r) => { if (!gone) setLive(r); }).catch(() => {});
    return () => { gone = true; };
  }, [productsLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  const setupDone = SETUP.filter((s) => (s.auto ? s.auto(settings) : settings.seoChecklist?.[s.key])).length;
  const siteProblems = live ? live.checks.filter((c) => !c.ok).length : 0;
  const score = healthScore(pages, siteProblems);
  const toFix = pages.filter((p) => p.worst === 'error' || p.worst === 'warning').length;
  const customCount = pages.filter((p) => p.custom.title || p.custom.description).length;

  const publish = async () => {
    setPublishing(true);
    try { await publishSeo(); toast('Website updated with the latest titles, products and photos'); runChecks(); }
    catch (e) { toast(`Could not reach the website server (${e.message}). Changes still go live within 10 minutes.`, 'warning'); }
    finally { setPublishing(false); }
  };

  const current = editing ? pages.find((p) => p.key === editing) : null;

  return (
    <div>
      <PageHeader
        title="SEO"
        subtitle="How Google and WhatsApp see zarocrackers.com, what to fix, and the title of every page"
        actions={<>
          <a href="https://search.google.com/search-console?resource_id=sc-domain%3Azarocrackers.com" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 h-9 px-3.5 rounded-lg text-sm font-medium bg-white hover:bg-zinc-50 text-zinc-800 ring-1 ring-inset ring-zinc-300 shadow-sm"><FiExternalLink size={15} /> Search Console</a>
          <Button icon={FiUploadCloud} disabled={publishing} onClick={publish} title="Make the website use the latest changes now instead of within 10 minutes">{publishing ? 'Publishing…' : 'Publish now'}</Button>
        </>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat label="SEO health" icon={FiActivity} value={productsLoading ? '…' : `${score}/100`} accent={scoreTone(score)} sub={siteProblems ? `${siteProblems} live ${siteProblems === 1 ? 'check fails' : 'checks fail'}` : 'Pages without problems'} />
        <Stat label="Pages for Google" icon={FiFileText} value={pages.length} sub={live ? `${live.sitemapUrls} in the live sitemap` : 'Checking sitemap…'} />
        <Stat label="Pages to fix" icon={FiAlertTriangle} value={toFix} accent={toFix ? 'text-amber-600' : 'text-emerald-600'} sub={`${groups.filter((g) => g.level !== 'info').length} kinds of problem`} />
        <Stat label="Setup" icon={FiCheckSquare} value={`${setupDone}/${SETUP.length}`} sub={`Steps done${customCount ? ` · ${customCount} custom ${customCount === 1 ? 'title' : 'titles'}` : ''}`} />
      </div>

      <Card bodyClassName="">
        <div className="px-4 pt-1">
          <Tabs value={tab} onChange={(v) => setParam('tab', v === 'overview' ? '' : v)} items={[
            { value: 'overview', label: 'Overview' },
            { value: 'google', label: 'Google' },
            { value: 'pages', label: 'Pages', count: pages.length },
            { value: 'issues', label: 'Issues', count: toFix },
            { value: 'setup', label: 'Setup', count: SETUP.length - setupDone },
          ]} />
        </div>
        {tab === 'overview' && <Overview pages={pages} groups={groups} live={live} checking={checking} runChecks={runChecks} onEdit={setEditing} openIssue={(id) => { const n = new URLSearchParams(params); n.set('tab', 'issues'); n.set('issue', id); setParams(n, { replace: true }); }} />}
        {tab === 'google' && <SearchConsolePanel />}
        {tab === 'pages' && <PagesTab pages={pages} params={params} setParam={setParam} onEdit={setEditing} />}
        {tab === 'issues' && <IssuesTab groups={groups} open={params.get('issue')} setOpen={(id) => setParam('issue', id)} onEdit={setEditing} />}
        {tab === 'setup' && <SetupTab settings={settings} />}
      </Card>

      <Drawer open={Boolean(current)} onClose={() => setEditing(null)} title={current ? `${KIND_LABEL[current.kind]} · ${current.label}` : ''} wide>
        {current && <PageEditor key={current.key} page={current} />}
      </Drawer>
    </div>
  );
}

/* ---------------- overview ---------------- */

function Overview({ pages, groups, live, checking, runChecks, onEdit, openIssue }) {
  const home = pages.find((p) => p.path === '/');
  const top = groups.filter((g) => g.level !== 'info').slice(0, 6);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-5">
      <section>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-zinc-900">Live check of the website</h3>
          <Button size="sm" variant="ghost" icon={FiRefreshCw} disabled={checking} onClick={runChecks}>{checking ? 'Checking…' : 'Run again'}</Button>
        </div>
        <ul className="rounded-xl border border-zinc-200 divide-y divide-zinc-100">
          {(live?.checks || Array.from({ length: 5 }, (_, i) => ({ id: i, label: 'Checking…', detail: '', ok: null }))).map((c) => {
            const Icon = c.ok == null ? FiRefreshCw : c.ok ? FiCheckCircle : FiXCircle;
            return (
              <li key={c.id} className="flex items-start gap-3 px-4 py-3">
                <Icon className={`mt-0.5 shrink-0 ${c.ok == null ? 'text-zinc-300 animate-spin' : c.ok ? 'text-emerald-600' : 'text-red-600'}`} size={16} />
                <div className="min-w-0"><div className="text-sm text-zinc-900">{c.label}</div>{c.detail && <div className="text-xs text-zinc-500 break-words">{c.detail}</div>}</div>
              </li>
            );
          })}
        </ul>
        {live && <p className="text-xs text-zinc-500 mt-2">Checked {fmtDateTime(live.checkedAt)} against the server this admin runs on.</p>}

        <h3 className="text-sm font-semibold text-zinc-900 mt-6 mb-2">Home page in Google</h3>
        {home && <GooglePreview path="/" title={home.title} description={home.description} />}
        <div className="mt-2"><Button size="sm" variant="secondary" icon={FiEdit2} onClick={() => onEdit('/')}>Edit home page title</Button></div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-zinc-900 mb-2">Fix these first</h3>
        {top.length === 0 ? (
          <div className="rounded-xl border border-zinc-200"><Empty icon={FiCheckCircle} title="Nothing important to fix">Every page has a good title, description, price and photo.</Empty></div>
        ) : (
          <ul className="rounded-xl border border-zinc-200 divide-y divide-zinc-100">
            {top.map((g) => {
              const L = LEVEL[g.level];
              return (
                <li key={g.id}>
                  <button type="button" onClick={() => openIssue(g.id)} className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-zinc-50">
                    <L.icon className={L.cls} size={16} />
                    <span className="flex-1 text-sm text-zinc-800">{g.title}</span>
                    <span className="text-sm font-semibold tabular-nums text-zinc-900">{g.pages.length}</span>
                    <FiChevronRight size={15} className="text-zinc-300" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        <div className="mt-6 rounded-xl bg-zinc-50 ring-1 ring-zinc-200 p-4 text-sm text-zinc-600 space-y-1.5">
          <p className="font-medium text-zinc-900">How changes reach Google</p>
          <p>Titles, prices, photos and new products update the website within 10 minutes, or straight away with Publish now.</p>
          <p>Google sees them the next time it visits, usually within a few days. To hurry an important page, open it here and choose Inspect in Search Console, then Request indexing.</p>
        </div>
      </section>
    </div>
  );
}

/* ---------------- pages ---------------- */

function PagesTab({ pages, params, setParam, onEdit }) {
  const q = params.get('q') || '';
  const kind = params.get('kind') || 'all';
  const show = params.get('show') || 'all';
  const list = useMemo(() => {
    let l = pages;
    if (kind !== 'all') l = l.filter((p) => p.kind === kind);
    if (show === 'problems') l = l.filter((p) => p.worst === 'error' || p.worst === 'warning');
    if (show === 'custom') l = l.filter((p) => p.custom.title || p.custom.description);
    if (q) { const s = q.toLowerCase(); l = l.filter((p) => [p.label, p.path, p.title].some((v) => v.toLowerCase().includes(s))); }
    return l;
  }, [pages, q, kind, show]);

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-zinc-100">
        <div className="relative flex-1 min-w-[220px]">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={15} />
          <input className={`${inputClass} pl-9`} placeholder="Search page, product or title" value={q} onChange={(e) => setParam('q', e.target.value)} />
        </div>
        <select className={`${inputClass} sm:!w-44`} value={kind} onChange={(e) => setParam('kind', e.target.value)} aria-label="Page type">
          <option value="all">All page types</option>
          <option value="page">Main pages</option>
          <option value="category">Categories</option>
          <option value="product">Products</option>
          <option value="guide">Guides</option>
        </select>
        <select className={`${inputClass} sm:!w-48`} value={show} onChange={(e) => setParam('show', e.target.value)} aria-label="Show">
          <option value="all">Any status</option>
          <option value="problems">Needs fixing</option>
          <option value="custom">Custom title or description</option>
        </select>
      </div>
      {list.length === 0 ? <Empty icon={FiFileText} title="No pages match">Try another search or filter.</Empty> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[860px]">
            <thead className="text-left text-xs font-medium text-zinc-500 bg-zinc-50/60">
              <tr>
                <th className="px-4 py-2.5 font-medium">Page</th>
                <th className="px-4 py-2.5 font-medium">Title in Google</th>
                <th className="px-4 py-2.5 font-medium text-right">Title</th>
                <th className="px-4 py-2.5 font-medium text-right">Description</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {list.map((p) => {
                const L = LEVEL[p.worst];
                const top = p.issues.find((i) => i.level === p.worst);
                return (
                  <tr key={p.key} onClick={() => onEdit(p.key)} className="cursor-pointer hover:bg-zinc-50">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        {p.kind === 'product' && <Thumb src={p.image} alt="" size="w-8 h-8" />}
                        <div className="min-w-0">
                          <div className="font-medium text-zinc-900 truncate max-w-[240px]">{p.label}</div>
                          <div className="text-xs text-zinc-500 truncate max-w-[240px]">{KIND_LABEL[p.kind]} · {p.path}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 max-w-[320px]">
                      <div className="truncate text-zinc-800" title={p.title}>{p.title}</div>
                      {(p.custom.title || p.custom.description) && <span className="text-[11px] text-emerald-700 bg-emerald-50 rounded px-1.5">custom</span>}
                    </td>
                    <td className={`px-4 py-2.5 text-right tabular-nums ${p.title.length > 60 ? 'text-amber-700' : 'text-zinc-600'}`}>{p.title.length}</td>
                    <td className={`px-4 py-2.5 text-right tabular-nums ${p.description.length < 70 ? 'text-amber-700' : 'text-zinc-600'}`}>{p.description.length}</td>
                    <td className="px-4 py-2.5">
                      <span className="inline-flex items-center gap-1.5 text-xs text-zinc-700" title={p.issues.map((i) => i.text).join('\n')}>
                        <span className={`w-2 h-2 rounded-full ${L.dot}`} />
                        {p.worst === 'ok' ? 'Good' : <span className="truncate max-w-[200px]">{top?.text}{p.issues.length > 1 ? ` +${p.issues.length - 1}` : ''}</span>}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

/* ---------------- issues ---------------- */

function IssuesTab({ groups, open, setOpen, onEdit }) {
  if (!groups.length) return <Empty icon={FiCheckCircle} title="No issues found">Every page passes the checks.</Empty>;
  return (
    <ul className="divide-y divide-zinc-100">
      {groups.map((g) => {
        const L = LEVEL[g.level];
        const isOpen = open === g.id;
        const productFix = ['no-photo', 'no-price', 'no-description'].includes(g.id);
        return (
          <li key={g.id}>
            <button type="button" onClick={() => setOpen(isOpen ? '' : g.id)} className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-zinc-50" aria-expanded={isOpen}>
              <L.icon className={L.cls} size={16} />
              <span className="flex-1 min-w-0"><span className="block text-sm font-medium text-zinc-900">{g.title}</span><span className="block text-xs text-zinc-500">{L.label} · {g.pages[0].issues.find((i) => i.id === g.id)?.text}</span></span>
              <span className="text-sm font-semibold tabular-nums text-zinc-900">{g.pages.length}</span>
              {isOpen ? <FiChevronDown size={16} className="text-zinc-400" /> : <FiChevronRight size={16} className="text-zinc-300" />}
            </button>
            {isOpen && (
              <ul className="bg-zinc-50/60 border-t border-zinc-100 divide-y divide-zinc-100">
                {g.pages.slice(0, 100).map((p) => (
                  <li key={p.key} className="flex items-center gap-3 px-5 py-2.5 pl-12">
                    {p.kind === 'product' && <Thumb src={p.image} alt="" size="w-8 h-8" />}
                    <div className="flex-1 min-w-0"><div className="text-sm text-zinc-900 truncate">{p.label}</div><div className="text-xs text-zinc-500 truncate">{p.title}</div></div>
                    {productFix && p.product
                      ? <Link to={`/admin/products/${encodeURIComponent(p.product.code)}`} className="text-sm font-medium text-primary hover:underline whitespace-nowrap">Edit product</Link>
                      : <Button size="sm" variant="secondary" icon={FiEdit2} onClick={() => onEdit(p.key)}>Fix</Button>}
                  </li>
                ))}
                {g.pages.length > 100 && <li className="px-12 py-2.5 text-xs text-zinc-500">and {g.pages.length - 100} more. Use the Pages tab to filter them.</li>}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/* ---------------- setup ---------------- */

function SetupTab({ settings }) {
  const toast = useToast();
  const tick = async (key, on) => {
    try { await saveSettings({ seoChecklist: { [key]: on ? new Date().toISOString().slice(0, 10) : '' } }); toast(on ? 'Marked as done' : 'Marked as not done'); }
    catch (e) { toast(e.message || 'Could not save', 'error'); }
  };
  return (
    <ul className="divide-y divide-zinc-100">
      {SETUP.map((s, i) => {
        const done = s.auto ? s.auto(settings) : Boolean(settings.seoChecklist?.[s.key]);
        return (
          <li key={s.key} className="flex items-start gap-4 px-5 py-4">
            <span className={`mt-0.5 w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-xs font-semibold ${done ? 'bg-emerald-100 text-emerald-700' : 'bg-zinc-100 text-zinc-500'}`}>{done ? <FiCheckCircle size={14} /> : i + 1}</span>
            <div className="flex-1 min-w-0">
              <div className={`text-sm font-medium ${done ? 'text-zinc-500 line-through decoration-zinc-300' : 'text-zinc-900'}`}>{s.label}</div>
              <div className="text-xs text-zinc-500 mt-0.5">{s.detail}{done && !s.auto && settings.seoChecklist?.[s.key] ? ` Done on ${settings.seoChecklist[s.key]}.` : ''}</div>
              {s.href && <a href={s.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline mt-1.5">Open <FiExternalLink size={11} /></a>}
              {s.to && <Link to={s.to} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline mt-1.5">Go to Settings</Link>}
            </div>
            {s.auto ? <span className="text-xs text-zinc-500 mt-1">{done ? 'Connected' : 'Not connected'}</span> : <Toggle tone="green" checked={done} onChange={(v) => tick(s.key, v)} label={done ? `Mark “${s.label}” as not done` : `Mark “${s.label}” as done`} />}
          </li>
        );
      })}
    </ul>
  );
}

/* ---------------- page editor ---------------- */

function PageEditor({ page }) {
  const toast = useToast();
  const [v, setV] = useState(page.custom);
  const [busy, setBusy] = useState(false);
  const [liveHead, setLiveHead] = useState(null);
  const [inspecting, setInspecting] = useState(false);
  const dirty = v.title.trim() !== page.custom.title || v.description.trim() !== page.custom.description;
  const title = fullTitle(v.title.trim() || page.auto.title);
  const description = v.description.trim() || page.auto.description;
  const image = page.kind === 'product' ? absoluteUrl(safeUrl(page.image)) : page.image;
  const links = toolLinks(page.url);

  const inspect = useCallback(() => {
    setInspecting(true);
    inspectLive(page.path).then(setLiveHead).catch((e) => setLiveHead({ error: e.message })).finally(() => setInspecting(false));
  }, [page.path]);

  const save = async () => {
    setBusy(true);
    const next = { title: v.title.trim(), description: v.description.trim() };
    try {
      if (page.kind === 'product') await upsertProduct(page.product.code, { ...page.product, seoTitle: next.title, seoDescription: next.description });
      else await saveSettings({ seoPages: { [page.path]: next } });
      await publishSeo().catch(() => null);
      toast('Saved. The website uses it now and Google picks it up on its next visit.');
      setTimeout(inspect, 400);
    } catch (e) { toast(e.message || 'Could not save', 'error'); }
    finally { setBusy(false); }
  };

  const liveMatches = liveHead && !liveHead.error && liveHead.title === fullTitle(page.custom.title || page.auto.title);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <a href={page.path} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline inline-flex items-center gap-1.5 min-w-0"><span className="truncate">{page.url}</span><FiExternalLink size={13} className="shrink-0" /></a>
        <div className="flex gap-2">
          {dirty && <Button variant="ghost" disabled={busy} onClick={() => setV(page.custom)}>Discard</Button>}
          <Button disabled={busy || !dirty} onClick={save}>{busy ? 'Saving…' : 'Save'}</Button>
        </div>
      </div>

      {page.issues.length > 0 && (
        <ul className="rounded-xl bg-white ring-1 ring-zinc-200 divide-y divide-zinc-100">
          {page.issues.map((i) => { const L = LEVEL[i.level]; return <li key={i.id} className="flex items-start gap-2.5 px-4 py-2.5 text-sm text-zinc-700"><L.icon className={`mt-0.5 shrink-0 ${L.cls}`} size={15} />{i.text}</li>; })}
          {page.kind === 'product' && page.issues.some((i) => ['no-photo', 'no-price', 'no-description'].includes(i.id)) && <li className="px-4 py-2.5 text-sm"><Link to={`/admin/products/${encodeURIComponent(page.product.code)}`} className="font-medium text-primary hover:underline">Add photo, price or description on the product page</Link></li>}
        </ul>
      )}

      <Card title="Search title and description"><SeoFields value={v} onChange={setV} auto={page.auto} /></Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div><div className="text-xs font-medium text-zinc-500 mb-1.5">Google</div><GooglePreview path={page.path} title={title} description={description} /></div>
        <div><div className="text-xs font-medium text-zinc-500 mb-1.5">WhatsApp link</div><WhatsAppPreview title={title} description={description} image={image} /></div>
      </div>

      <Card title="Live on the website" action={<Button size="sm" variant="secondary" icon={FiRefreshCw} disabled={inspecting} onClick={inspect}>{inspecting ? 'Checking…' : liveHead ? 'Check again' : 'Check now'}</Button>}>
        {!liveHead ? <p className="text-sm text-zinc-500">See exactly what the server sends to Google and WhatsApp for this page.</p> : liveHead.error ? <p className="text-sm text-red-600">Could not load the page: {liveHead.error}</p> : (
          <dl className="text-sm grid grid-cols-[110px_1fr] gap-x-3 gap-y-2">
            <dt className="text-zinc-500">Status</dt><dd className={liveHead.status === 200 ? 'text-zinc-900' : 'text-red-600'}>{liveHead.status === 200 ? '200 OK' : liveHead.status}</dd>
            <dt className="text-zinc-500">Title</dt><dd className="text-zinc-900 break-words">{liveHead.title}{!liveMatches && <span className="block text-xs text-amber-700 mt-0.5">Not the saved title yet. Press Publish now at the top, or wait up to 10 minutes.</span>}</dd>
            <dt className="text-zinc-500">Description</dt><dd className="text-zinc-700 break-words">{liveHead.description}</dd>
            <dt className="text-zinc-500">Indexing</dt><dd className={/noindex/.test(liveHead.robots) ? 'text-red-600' : 'text-zinc-700'}>{liveHead.robots || 'index, follow'}</dd>
            <dt className="text-zinc-500">Canonical</dt><dd className="text-zinc-700 break-all">{liveHead.canonical}</dd>
            <dt className="text-zinc-500">Share image</dt><dd className="text-zinc-700 break-all">{liveHead.ogImage}</dd>
            <dt className="text-zinc-500">Rich results</dt><dd className="text-zinc-700">{liveHead.types.join(', ') || 'None'}</dd>
          </dl>
        )}
      </Card>

      <div className="flex flex-wrap gap-2">
        <ToolLink href={links.inspect}>Inspect in Search Console</ToolLink>
        <ToolLink href={links.rich}>Test rich results</ToolLink>
        <ToolLink href={links.speed}>PageSpeed (mobile)</ToolLink>
        <ToolLink href={links.google}>Is it on Google?</ToolLink>
      </div>
    </div>
  );
}

const ToolLink = ({ href, children }) => <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-[13px] font-medium bg-white hover:bg-zinc-50 text-zinc-700 ring-1 ring-inset ring-zinc-300">{children}<FiExternalLink size={12} /></a>;
