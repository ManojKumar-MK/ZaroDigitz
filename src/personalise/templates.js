// Personalisation: a design's layout (the Photoshop JPG plus text, date and photo boxes) and a
// customer's filled-in details. Layout lives in `templates/<product code>` (public read,
// admin write); a customer's details and photos go to `personalisations/<token>` (create only).
import { getFirebase, isFirebaseEnabled } from '../firebase/client';
import { API_URL } from '../firebase/apiStore';

/** Fonts the admin can pick for a box (Google Fonts, loaded in index.html). */
export const FONTS = [
  { id: 'poppins', label: 'Poppins (clean)', family: "'Poppins', sans-serif" },
  { id: 'playfair', label: 'Playfair Display (elegant serif)', family: "'Playfair Display', serif" },
  { id: 'cinzel', label: 'Cinzel (classic capitals)', family: "'Cinzel', serif" },
  { id: 'greatvibes', label: 'Great Vibes (script)', family: "'Great Vibes', cursive" },
  { id: 'notoseriftamil', label: 'Noto Serif Tamil', family: "'Noto Serif Tamil', serif" },
  { id: 'muktamalar', label: 'Mukta Malar (Tamil, clean)', family: "'Mukta Malar', sans-serif" },
];
export const fontFamily = (id) => (FONTS.find((f) => f.id === id) || FONTS[0]).family;

/** Ready-made wording the customer can start from (original lines; edit freely). */
export const WORDING = [
  'With the blessings of our elders, we invite you to celebrate the wedding of our children.',
  'Together with their families, request the pleasure of your company at their wedding.',
  'Your presence and blessings will make our celebration complete.',
  'Kindly join us for the wedding ceremony followed by lunch.',
  'பெரியோர்களின் ஆசியுடன் நடைபெறும் எங்கள் இல்லத் திருமண விழாவிற்கு தங்களை அன்புடன் அழைக்கிறோம்.',
  'தாங்கள் தங்கள் குடும்பத்துடன் வருகை தந்து மணமக்களை வாழ்த்தி அருள வேண்டுகிறோம்.',
];

export const newFieldId = () => Math.random().toString(36).slice(2, 9);

/** A new box in the middle of the design. */
export function newField(type) {
  const base = { id: newFieldId(), type, x: 0.3, y: 0.4, w: 0.4, h: 0.08, label: '', sample: '', font: 'playfair', size: 5, color: '#7A1F2B', align: 'center', max: 40, lines: 1, lang: 'en' };
  if (type === 'photo') return { ...base, label: 'Photo', w: 0.28, h: 0.2, shape: 'circle' };
  if (type === 'date') return { ...base, label: 'Event date', size: 3.2, font: 'poppins', dateStyle: 'long' };
  return { ...base, label: 'Name', sample: 'Priya' };
}

export async function loadTemplate(code) {
  if (!isFirebaseEnabled || !code) return null;
  try {
    const { db, fs } = await getFirebase();
    const snap = await fs.getDoc(fs.doc(db, 'templates', String(code)));
    const t = snap.exists() ? snap.data() : null;
    return t && t.image && Array.isArray(t.fields) ? t : null;
  } catch {
    return null;
  }
}

export async function saveTemplate(code, template) {
  const { db, fs } = await getFirebase();
  await fs.setDoc(fs.doc(db, 'templates', String(code)), { ...template, updatedAt: fs.serverTimestamp() });
}

export async function deleteTemplate(code) {
  const { db, fs } = await getFirebase();
  await fs.deleteDoc(fs.doc(db, 'templates', String(code)));
}

const token = () => Array.from(globalThis.crypto.getRandomValues(new Uint8Array(18)), (b) => 'abcdefghijklmnopqrstuvwxyz0123456789'[b % 36]).join('');

/** Store a customer's details, photos and preview; returns the token kept on the cart line. */
export async function savePersonalisation({ code, name, values, photos, preview }) {
  if (!isFirebaseEnabled) return null;
  const id = token();
  const { db, fs } = await getFirebase();
  await fs.setDoc(fs.doc(db, 'personalisations', id), { code, name, values, photos, preview, createdAt: fs.serverTimestamp() });
  return id;
}

export async function loadPersonalisation(id) {
  const { db, fs } = await getFirebase();
  const snap = await fs.getDoc(fs.doc(db, 'personalisations', id));
  return snap.exists() ? snap.data() : null;
}

/** Tamil spelling for English words ("Priya Arjun" -> "பிரியா அர்ஜுன்"), via the API. */
export async function toTamil(text) {
  const words = String(text || '').match(/[A-Za-z]+/g) || [];
  const unique = [...new Set(words.map((w) => w.toLowerCase()))].slice(0, 12);
  if (!unique.length) return text;
  const r = await fetch(`${API_URL}/v1/translit?words=${encodeURIComponent(unique.join(','))}`).then((x) => x.json()).catch(() => null);
  const map = r?.words || {};
  return String(text).replace(/[A-Za-z]+/g, (w) => map[w.toLowerCase()] || w);
}

const TA_DAYS = ['ஞாயிறு', 'திங்கள்', 'செவ்வாய்', 'புதன்', 'வியாழன்', 'வெள்ளி', 'சனி'];
const TA_MONTHS = ['ஜனவரி', 'பிப்ரவரி', 'மார்ச்', 'ஏப்ரல்', 'மே', 'ஜூன்', 'ஜூலை', 'ஆகஸ்ட்', 'செப்டம்பர்', 'அக்டோபர்', 'நவம்பர்', 'டிசம்பர்'];

/** How a date box prints its value, in English, Tamil or both. */
export function formatDate(value, lang = 'en') {
  if (!value) return '';
  const d = new Date(`${value}T00:00:00`);
  if (Number.isNaN(d.getTime())) return value;
  const en = d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const ta = `${d.getDate()} ${TA_MONTHS[d.getMonth()]} ${d.getFullYear()}, ${TA_DAYS[d.getDay()]}`;
  return lang === 'ta' ? ta : lang === 'both' ? `${ta}\n${en}` : en;
}

/** What a box shows: the customer's value, else the sample. */
export function displayText(field, values = {}) {
  const v = values[field.id];
  if (field.type === 'date') return formatDate(v, field.lang) || formatDate('2027-01-24', field.lang);
  const text = String(v ?? '').trim();
  return text || field.sample || field.label;
}

/** Load an image element from a URL or data URL. */
export const loadImage = (src) => new Promise((resolve, reject) => {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => resolve(img);
  img.onerror = reject;
  img.src = src;
});

/** Break text into lines that fit `maxWidth` on the canvas. */
function wrapLines(ctx, text, maxWidth) {
  const out = [];
  String(text).split('\n').forEach((para) => {
    let line = '';
    para.split(/\s+/).forEach((word) => {
      const test = line ? `${line} ${word}` : word;
      if (ctx.measureText(test).width > maxWidth && line) { out.push(line); line = word; } else line = test;
    });
    out.push(line);
  });
  return out;
}

/**
 * Draw the finished preview: the design, every text and date box, every photo in its frame.
 * photos: { [fieldId]: { src, zoom, x, y } }. Returns a JPEG data URL `width` pixels wide.
 */
export async function renderPreview(template, values = {}, photos = {}, width = 1000) {
  const bg = await loadImage(template.image);
  const scale = width / bg.naturalWidth;
  const W = width;
  const H = Math.round(bg.naturalHeight * scale);
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bg, 0, 0, W, H);
  await Promise.all(FONTS.map((f) => document.fonts?.load?.(`32px ${f.family}`).catch(() => null)));
  for (const f of template.fields) {
    const x = f.x * W; const y = f.y * H; const w = f.w * W; const h = f.h * H;
    if (f.type === 'photo') {
      const p = photos[f.id];
      if (!p?.src) continue;
      const img = await loadImage(p.src);
      ctx.save();
      ctx.beginPath();
      if (f.shape === 'circle') ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2); else ctx.rect(x, y, w, h);
      ctx.clip();
      const cover = Math.max(w / img.naturalWidth, h / img.naturalHeight) * (p.zoom || 1);
      const iw = img.naturalWidth * cover; const ih = img.naturalHeight * cover;
      ctx.drawImage(img, x + (w - iw) / 2 + (p.x || 0) * w, y + (h - ih) / 2 + (p.y || 0) * h, iw, ih);
      ctx.restore();
      continue;
    }
    const size = (f.size / 100) * W;
    ctx.font = `${f.bold ? '700 ' : ''}${size}px ${fontFamily(f.font)}`;
    ctx.fillStyle = f.color || '#000';
    ctx.textBaseline = 'middle';
    ctx.textAlign = f.align === 'left' ? 'left' : f.align === 'right' ? 'right' : 'center';
    const lines = wrapLines(ctx, displayText(f, values), w);
    const lh = size * 1.25;
    const tx = f.align === 'left' ? x : f.align === 'right' ? x + w : x + w / 2;
    let ty = y + h / 2 - ((lines.length - 1) * lh) / 2;
    lines.forEach((line) => { ctx.fillText(line, tx, ty); ty += lh; });
  }
  return canvas.toDataURL('image/jpeg', 0.82);
}
