import { useCallback, useEffect, useMemo, useState } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { FiRefreshCw, FiExternalLink, FiCheckCircle, FiAlertTriangle, FiXCircle, FiKey } from 'react-icons/fi';
import { apiRequest } from '../firebase/apiStore';
import { getFirebaseAuth } from '../firebase/client';
import { useToast } from './Toast';
import { Button, Empty, Stat, fmtDateTime } from './ui';

// Validated (dataviz validator) single-series colours, one chart per measure (no dual axis).
const COLORS = {
  light: { clicks: '#2a78d6', impressions: '#eb6834', grid: '#e7e5e4', axis: '#6b6b70' },
  dark: { clicks: '#3987e5', impressions: '#d95926', grid: '#2e2e33', axis: '#a1a1aa' },
};
const RANGES = [7, 28, 90];
const fmtInt = (n) => Number(n || 0).toLocaleString('en-IN');
const fmtPct = (n) => `${(Number(n || 0) * 100).toFixed(1)}%`;
const fmtPos = (n) => (n ? Number(n).toFixed(1) : '—');
const shortDate = (d) => new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
const pathOf = (url) => { try { const u = new URL(url); return u.pathname === '/' ? '/' : u.pathname; } catch { return url; } };

function useIsDark() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  useEffect(() => {
    const o = new MutationObserver(() => setDark(document.documentElement.classList.contains('dark')));
    o.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => o.disconnect();
  }, []);
  return dark;
}

/** Totals for a window of days from the daily rows (weighted CTR and position). */
function summarize(rows) {
  const clicks = rows.reduce((s, r) => s + r.clicks, 0);
  const impressions = rows.reduce((s, r) => s + r.impressions, 0);
  const position = impressions ? rows.reduce((s, r) => s + r.position * r.impressions, 0) / impressions : 0;
  return { clicks, impressions, ctr: impressions ? clicks / impressions : 0, position };
}
const delta = (now, before, invert = false) => {
  if (!before) return null;
  const d = (now - before) / before;
  const good = invert ? d < 0 : d > 0;
  return { text: `${d > 0 ? '+' : ''}${(d * 100).toFixed(0)}% vs previous`, good };
};

function TrendChart({ title, data, dataKey, color, grid, axis, format }) {
  return (
    <div className="rounded-xl border border-zinc-200 p-4">
      <h3 className="text-sm font-semibold text-zinc-900 mb-2">{title}</h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={grid} vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 11, fill: axis }} tickLine={false} axisLine={{ stroke: grid }} minTickGap={24} />
            <YAxis tick={{ fontSize: 11, fill: axis }} tickLine={false} axisLine={false} width={40} allowDecimals={false} />
            <Tooltip formatter={(v) => [format(v), title]} labelFormatter={(l) => l} contentStyle={{ fontSize: 12, borderRadius: 8 }} cursor={{ stroke: axis, strokeDasharray: '3 3' }} />
            <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function RankTable({ title, rows, labelKey, labelFmt = (v) => v, note }) {
  return (
    <div className="rounded-xl border border-zinc-200 overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-100 flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
        {note && <span className="text-xs text-zinc-500">{note}</span>}
      </div>
      {rows.length === 0 ? <p className="px-4 py-6 text-sm text-zinc-500">No data yet.</p> : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-zinc-500 bg-zinc-50/60">
              <tr><th className="px-4 py-2 font-medium">{labelKey === 'query' ? 'Search' : 'Page'}</th><th className="px-3 py-2 font-medium text-right">Clicks</th><th className="px-3 py-2 font-medium text-right">Impr.</th><th className="px-3 py-2 font-medium text-right">CTR</th><th className="px-4 py-2 font-medium text-right">Position</th></tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rows.slice(0, 15).map((r) => (
                <tr key={r[labelKey]}>
                  <td className="px-4 py-2 text-zinc-800 max-w-[260px] truncate" title={r[labelKey]}>{labelFmt(r[labelKey])}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-zinc-900">{fmtInt(r.clicks)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-zinc-600">{fmtInt(r.impressions)}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-zinc-600">{fmtPct(r.ctr)}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-zinc-600">{fmtPos(r.position)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const VERDICT = {
  PASS: { icon: FiCheckCircle, cls: 'text-emerald-600', label: 'Indexed' },
  NEUTRAL: { icon: FiAlertTriangle, cls: 'text-amber-600', label: 'Not indexed' },
  PARTIAL: { icon: FiAlertTriangle, cls: 'text-amber-600', label: 'Indexed with issues' },
  FAIL: { icon: FiXCircle, cls: 'text-red-600', label: 'Error' },
  ERROR: { icon: FiXCircle, cls: 'text-red-600', label: 'Could not check' },
  UNKNOWN: { icon: FiAlertTriangle, cls: 'text-zinc-500', label: 'Unknown' },
};

function SetupSteps({ email }) {
  return (
    <div className="p-5 space-y-4">
      <div className="flex items-start gap-3">
        <span className="w-9 h-9 rounded-lg bg-zinc-100 text-zinc-600 flex items-center justify-center shrink-0"><FiKey /></span>
        <div>
          <h3 className="font-semibold text-zinc-900">Connect Google Search Console</h3>
          <p className="text-sm text-zinc-600 mt-0.5">One-time setup, about 10 minutes. After that, clicks, searches, top pages and index status show here and refresh twice a day.</p>
        </div>
      </div>
      <ol className="list-decimal pl-6 space-y-2 text-sm text-zinc-700">
        <li>Open <a className="text-primary hover:underline" href="https://console.cloud.google.com/projectcreate" target="_blank" rel="noopener noreferrer">Google Cloud Console</a> and create a project, e.g. “zaro-seo”.</li>
        <li>Turn on the <a className="text-primary hover:underline" href="https://console.cloud.google.com/apis/library/searchconsole.googleapis.com" target="_blank" rel="noopener noreferrer">Google Search Console API</a> for that project.</li>
        <li>Go to <a className="text-primary hover:underline" href="https://console.cloud.google.com/iam-admin/serviceaccounts" target="_blank" rel="noopener noreferrer">IAM → Service accounts</a> → Create service account (no roles needed) → Keys → Add key → JSON. A .json file downloads.</li>
        <li>In Hostinger: Websites → <strong>digitz-api.zarocrackers.com</strong> → Node.js → Environment variables → Add: name <code className="text-xs bg-zinc-100 px-1 rounded">GSC_SERVICE_ACCOUNT_JSON</code>, value = the whole contents of the .json file. Save (the app restarts). Do not remove the other variables.</li>
        <li>In <a className="text-primary hover:underline" href="https://search.google.com/search-console/users?resource_id=sc-domain%3Azarocrackers.com" target="_blank" rel="noopener noreferrer">Search Console → Settings → Users and permissions</a> → Add user: the service account’s email{email ? <> (<code className="text-xs bg-zinc-100 px-1 rounded">{email}</code>)</> : ' (it ends with .iam.gserviceaccount.com)'}, permission <strong>Restricted</strong>.</li>
      </ol>
      <p className="text-xs text-zinc-500">The key only allows reading Search Console data. It stays in Hostinger’s settings and never goes into the website code.</p>
    </div>
  );
}

/** "Google" tab of Admin → SEO: Search Console data served by digitz-api.zarocrackers.com. */
export default function SearchConsolePanel() {
  const toast = useToast();
  const dark = useIsDark();
  const c = dark ? COLORS.dark : COLORS.light;
  const [state, setState] = useState(null); // response of /v1/admin/gsc
  const [error, setError] = useState('');
  const [range, setRange] = useState(28);
  const [syncing, setSyncing] = useState(false);

  const fetchState = useCallback(async () => {
    await getFirebaseAuth(); // make sure the admin's token is attached
    return apiRequest('GET', '/v1/admin/gsc');
  }, []);
  // Load now, and while the first fetch from Google runs in the background, check every 5 s.
  useEffect(() => {
    let gone = false;
    let timer = null;
    const tick = () => fetchState()
      .then((r) => { if (gone) return; setState(r); setError(''); if (r.configured && !r.snapshot) timer = setTimeout(tick, 5000); })
      .catch((e) => { if (!gone) setError(e.message || 'Could not reach the API'); });
    tick();
    return () => { gone = true; clearTimeout(timer); };
  }, [fetchState]);

  const refresh = async () => {
    setSyncing(true);
    try { const r = await apiRequest('POST', '/v1/admin/gsc/sync'); setState((s) => ({ ...s, snapshot: r.snapshot, refreshing: false })); toast('Search Console data updated'); }
    catch (e) { toast(e.message || 'Refresh failed', 'error'); }
    finally { setSyncing(false); }
  };

  const snap = state?.snapshot;
  const view = useMemo(() => {
    if (!snap?.daily?.length) return null;
    const days = [...snap.daily].sort((a, b) => a.date.localeCompare(b.date));
    const cur = days.slice(-range);
    const prev = days.slice(-2 * range, -range);
    return { cur: summarize(cur), prev: prev.length === range ? summarize(prev) : null, series: cur.map((d) => ({ ...d, label: shortDate(d.date) })), from: cur[0]?.date, to: cur[cur.length - 1]?.date };
  }, [snap, range]);

  if (error) return <div className="p-5 text-sm text-red-600">{error}</div>;
  if (!state) return <p className="p-5 text-sm text-zinc-500">Loading…</p>;
  if (!state.configured) return <SetupSteps email={state.serviceAccount} />;
  if (!snap) return <Empty icon={FiRefreshCw} title="Fetching your data from Google…">The first fetch takes up to a minute. If it keeps failing, check that {state.serviceAccount} is added in Search Console.</Empty>;

  const listRange = range === 90 ? 90 : 28;
  return (
    <div className="p-5 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg ring-1 ring-zinc-200 p-0.5 bg-white" role="group" aria-label="Date range">
          {RANGES.map((r) => (
            <button key={r} type="button" onClick={() => setRange(r)} aria-pressed={range === r} className={`px-3 h-8 rounded-md text-sm font-medium ${range === r ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:bg-zinc-100'}`}>{r} days</button>
          ))}
        </div>
        <div className="flex items-center gap-3 text-xs text-zinc-500">
          <span>Updated {fmtDateTime(snap.syncedAt)} · Google’s numbers run 2–3 days behind</span>
          <Button size="sm" variant="secondary" icon={FiRefreshCw} disabled={syncing} onClick={refresh}>{syncing ? 'Refreshing…' : 'Refresh'}</Button>
        </div>
      </div>

      {view ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Stat label="Clicks" value={fmtInt(view.cur.clicks)} sub={delta(view.cur.clicks, view.prev?.clicks)?.text || `${shortDate(view.from)} – ${shortDate(view.to)}`} />
            <Stat label="Impressions" value={fmtInt(view.cur.impressions)} sub={delta(view.cur.impressions, view.prev?.impressions)?.text || 'Times shown in Google'} />
            <Stat label="Click rate" value={fmtPct(view.cur.ctr)} sub="Clicks ÷ impressions" />
            <Stat label="Average position" value={fmtPos(view.cur.position)} sub={delta(view.cur.position, view.prev?.position, true) ? `${(view.prev.position - view.cur.position > 0 ? 'Up ' : 'Down ')}${Math.abs(view.prev.position - view.cur.position).toFixed(1)} vs previous` : 'Lower is better'} />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <TrendChart title="Clicks per day" data={view.series} dataKey="clicks" color={c.clicks} grid={c.grid} axis={c.axis} format={fmtInt} />
            <TrendChart title="Impressions per day" data={view.series} dataKey="impressions" color={c.impressions} grid={c.grid} axis={c.axis} format={fmtInt} />
          </div>
        </>
      ) : <p className="text-sm text-zinc-500">Google has no search data for the site yet. It appears a few days after pages start showing in results.</p>}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <RankTable title="Top searches" rows={snap.queries?.[listRange] || []} labelKey="query" note={`last ${listRange} days`} />
        <RankTable title="Top pages" rows={snap.pages?.[listRange] || []} labelKey="page" labelFmt={pathOf} note={`last ${listRange} days`} />
      </div>

      <div className="rounded-xl border border-zinc-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-100"><h3 className="text-sm font-semibold text-zinc-900">Are key pages in Google?</h3></div>
        <ul className="divide-y divide-zinc-100">
          {(snap.inspections || []).map((p) => {
            const v = VERDICT[p.verdict] || VERDICT.UNKNOWN;
            const canonicalMismatch = p.googleCanonical && p.userCanonical && p.googleCanonical !== p.userCanonical;
            return (
              <li key={p.path} className="flex items-start gap-3 px-4 py-2.5">
                <v.icon className={`mt-0.5 shrink-0 ${v.cls}`} size={16} aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-zinc-900">{p.path} <span className={`ml-1 text-xs ${v.cls}`}>{v.label}</span></div>
                  <div className="text-xs text-zinc-500 truncate" title={p.coverage}>{p.coverage}{p.lastCrawl ? ` · crawled ${fmtDateTime(p.lastCrawl)}` : ''}{canonicalMismatch ? ` · Google chose ${p.googleCanonical}` : ''}</div>
                </div>
                <a href={`https://search.google.com/search-console/inspect?resource_id=${encodeURIComponent('sc-domain:zarocrackers.com')}&id=${encodeURIComponent(p.url)}`} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1 shrink-0">Inspect <FiExternalLink size={11} /></a>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
