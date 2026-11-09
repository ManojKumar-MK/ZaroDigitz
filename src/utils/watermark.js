// Stamp the Zaro Digitz logo and name onto a product photo before it is saved, so a downloaded
// copy still carries the brand. Settings come from Admin → Settings → Photo watermark.

export const DEFAULT_WATERMARK = { enabled: true, position: 'bottom-right', opacity: 0.6, size: 0.18 };

const load = (src) => new Promise((resolve, reject) => {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => resolve(img);
  img.onerror = reject;
  img.src = src;
});

/** dataUrl (JPEG/PNG/WebP) -> watermarked JPEG data URL. Returns the original if anything fails. */
export async function applyWatermark(dataUrl, options = {}) {
  const o = { ...DEFAULT_WATERMARK, ...options };
  try {
    const [photo, logo] = await Promise.all([load(dataUrl), load('/zaro-logo-112.webp')]);
    const W = photo.naturalWidth; const H = photo.naturalHeight;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    ctx.drawImage(photo, 0, 0);

    // A badge of logo + name, sized from the photo's width.
    const bw = Math.round(W * o.size);
    const logoSize = Math.round(bw * 0.3);
    const fontSize = Math.round(logoSize * 0.42);
    ctx.font = `700 ${fontSize}px Poppins, Arial, sans-serif`;
    const textW = ctx.measureText('ZARO Digitz').width;
    const pad = Math.round(logoSize * 0.25);
    const badgeW = logoSize + pad * 3 + textW;
    const badgeH = logoSize + pad * 2;
    const margin = Math.round(W * 0.025);
    const x = o.position.includes('left') ? margin : W - badgeW - margin;
    const y = o.position.includes('top') ? margin : H - badgeH - margin;

    ctx.globalAlpha = o.opacity;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.roundRect?.(x, y, badgeW, badgeH, badgeH / 2);
    if (!ctx.roundRect) ctx.rect(x, y, badgeW, badgeH);
    ctx.fill();
    ctx.drawImage(logo, x + pad, y + pad, logoSize, logoSize);
    ctx.fillStyle = '#211114';
    ctx.textBaseline = 'middle';
    ctx.fillText('ZARO Digitz', x + pad * 2 + logoSize, y + badgeH / 2);
    ctx.globalAlpha = 1;
    return c.toDataURL('image/jpeg', 0.86);
  } catch {
    return dataUrl;
  }
}
