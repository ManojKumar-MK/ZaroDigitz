// Settings for the live preview (src/components/LiveCard.jsx): fields, proof message, which mode suits a category.

export const LIVE_MODES = {
  wedding: {
    label: 'Wedding card',
    title: 'Try your names on the card',
    fields: [
      { key: 'a', label: "Bride's name", placeholder: 'Priya', max: 24 },
      { key: 'b', label: "Groom's name", placeholder: 'Arjun', max: 24 },
      { key: 'date', label: 'Wedding date', type: 'date' },
      { key: 'town', label: 'Town', placeholder: 'Sivakasi', max: 30 },
    ],
    proof: (v) => `Please send me a proof for our wedding card.\nNames: ${v.a} & ${v.b}\nDate: ${v.date}\nPlace: ${v.town}`,
  },
  notebook: {
    label: 'Notebook',
    title: 'Try your name on the cover',
    fields: [
      { key: 'a', label: 'School, college or company', placeholder: 'St. Mary’s Matric School', max: 34 },
      { key: 'b', label: 'Line under it', placeholder: 'Sivakasi', max: 30 },
      { key: 'town', label: 'Year or class', placeholder: '2027–28', max: 16 },
    ],
    proof: (v) => `Please send me a proof for custom notebooks.\nName on cover: ${v.a}\nLine: ${v.b}\nYear: ${v.town}`,
  },
  diary: {
    label: 'Diary',
    title: 'Try your name on the diary',
    fields: [
      { key: 'a', label: 'Company name', placeholder: 'Sri Murugan Traders', max: 30 },
      { key: 'b', label: 'Name to emboss', placeholder: 'R. Karthik', max: 24 },
      { key: 'town', label: 'Year', placeholder: '2027', max: 8 },
    ],
    proof: (v) => `Please send me a proof for custom diaries.\nCompany: ${v.a}\nEmboss: ${v.b}\nYear: ${v.town}`,
  },
};

/** Which preview suits a category of product. */
export function modeFor(category = '') {
  if (/notebook|bill|receipt|label|sticker|box|printing|stationery|visiting/i.test(category)) return 'notebook';
  if (/diar|calendar/i.test(category)) return 'diary';
  return 'wedding';
}

const fmtDate = (v) => {
  if (!v) return '';
  const d = new Date(`${v}T00:00:00`);
  return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};

/** Filled-in values with placeholders for anything left blank (dates formatted). */
export function liveValues(mode, values = {}) {
  const out = {};
  LIVE_MODES[mode].fields.forEach((f) => {
    const v = String(values[f.key] || '').trim();
    out[f.key] = f.type === 'date' ? fmtDate(v) || 'Sunday, 24 January 2027' : v || f.placeholder;
  });
  return out;
}
