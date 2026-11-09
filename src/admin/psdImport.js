// Turn a Photoshop file into a personalisation template, in the browser:
// - every visible layer that is not text (and not a photo frame) is painted into the background;
// - every text layer becomes a text box at the same place, size and colour;
// - a layer whose name starts with "photo" becomes a photo box (add "circle" for a round frame);
// - a text layer whose name contains "date" becomes a date box.
import { newFieldId } from '../personalise/templates';

const MAX_WIDTH = 1600;

function fontFor(name = '') {
  const n = name.toLowerCase();
  if (/tamil|latha|bamini|nirmala|vijaya|mukta|noto.*tamil/.test(n)) return 'muktamalar';
  if (/script|vibes|brush|allura|pinyon|tangerine|signature|hand/.test(n)) return 'greatvibes';
  if (/cinzel|trajan|caps/.test(n)) return 'cinzel';
  if (/serif|playfair|times|garamond|georgia|bodoni|didot|baskerville/.test(n)) return 'playfair';
  return 'poppins';
}
const hex = (c) => (c && typeof c.r === 'number' ? `#${[c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}` : '#000000');
const alignFor = (j) => (j === 'right' ? 'right' : j === 'center' ? 'center' : 'left');

function leaves(layers = [], out = []) {
  layers.forEach((l) => {
    if (l.hidden) return;
    if (l.children) leaves(l.children, out); else out.push(l);
  });
  return out;
}

/** file: a .psd File. Returns { image (JPEG data URL), fields, notes }. */
export async function psdToTemplate(file) {
  const { readPsd } = await import('ag-psd');
  const psd = readPsd(await file.arrayBuffer(), { skipThumbnail: true });
  const W = psd.width;
  const H = psd.height;
  const scale = Math.min(1, MAX_WIDTH / W);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(W * scale);
  canvas.height = Math.round(H * scale);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const fields = [];
  const notes = [];
  for (const l of leaves(psd.children)) {
    const left = l.left || 0; const top = l.top || 0;
    const w = Math.max(1, (l.right || 0) - left); const h = Math.max(1, (l.bottom || 0) - top);
    const box = { x: left / W, y: top / H, w: w / W, h: h / H };
    const name = String(l.name || '').trim();
    if (/^photo/i.test(name)) {
      fields.push({ id: newFieldId(), type: 'photo', label: name.replace(/^photo[\s_-]*/i, '') || 'Photo', shape: /circle|round/i.test(name) ? 'circle' : 'rect', ...box, lines: 1, lang: 'en' });
      continue;
    }
    if (l.text) {
      const style = l.text.style || {};
      const size = (style.fontSize || 24) * (l.text.transform?.[3] || 1);
      const text = String(l.text.text || '').trim();
      fields.push({
        id: newFieldId(),
        type: /date/i.test(name) ? 'date' : 'text',
        label: name || text.slice(0, 24) || 'Text',
        sample: text,
        font: fontFor(style.font?.name),
        size: Math.round((size / W) * 1000) / 10,
        color: hex(style.fillColor),
        bold: Boolean(style.fauxBold) || /bold|black|heavy/i.test(style.font?.name || ''),
        align: alignFor(l.text.paragraphStyle?.justification),
        max: Math.max(20, text.length * 2),
        lines: text.includes('\n') || box.h > 0.08 ? 3 : 1,
        lang: /[஀-௿]/.test(text) ? 'ta' : 'en',
        ...box,
      });
      continue;
    }
    if (l.canvas) {
      ctx.globalAlpha = typeof l.opacity === 'number' ? l.opacity : 1;
      ctx.drawImage(l.canvas, left * scale, top * scale, w * scale, h * scale);
      ctx.globalAlpha = 1;
      if (l.blendMode && l.blendMode !== 'normal' && l.blendMode !== 'pass through') notes.push(`Layer "${name}" uses blend mode "${l.blendMode}"; it is shown as normal. Merge it in Photoshop if it looks different.`);
    }
  }
  if (!fields.length) notes.push('No text layers found. Add boxes with the buttons, or keep names and dates as live text layers in Photoshop.');
  return { image: canvas.toDataURL('image/jpeg', 0.88), fields, notes };
}
