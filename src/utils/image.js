/**
 * Shrink a photo in the browser so it fits comfortably inside a Firestore document
 * (LR copies, package photos). Returns a JPEG data URL.
 */
export async function compressImage(file, { maxDimension = 1280, quality = 0.72, maxBytes = 160 * 1024, format = 'image/jpeg' } = {}) {
  const bitmap = await loadImage(file);
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  // WebP when the browser can encode it (smaller), otherwise JPEG
  const type = format === 'image/webp' && canvas.toDataURL('image/webp', 0.5).startsWith('data:image/webp') ? 'image/webp' : 'image/jpeg';
  let q = quality;
  let dataUrl = canvas.toDataURL(type, q);
  // data URL bytes ≈ length * 3/4; step quality down until it fits
  while (dataUrl.length * 0.75 > maxBytes && q > 0.3) {
    q -= 0.1;
    dataUrl = canvas.toDataURL(type, q);
  }
  if (dataUrl.length * 0.75 > maxBytes) {
    // still too big: shrink the canvas and try once more
    const c2 = document.createElement('canvas');
    c2.width = Math.round(canvas.width * 0.7);
    c2.height = Math.round(canvas.height * 0.7);
    c2.getContext('2d').drawImage(canvas, 0, 0, c2.width, c2.height);
    dataUrl = c2.toDataURL(type, 0.6);
  }
  return dataUrl;
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read image')); };
    img.src = url;
  });
}

/** 192px copy of a built-in product photo (for small thumbnails) (public/products/sm/), or the same URL for other images. */
export function thumbUrl(src) {
  const s = String(src || '');
  return s.startsWith('/products/') && !s.startsWith('/products/sm/') ? `/products/sm/${s.slice('/products/'.length)}` : s;
}
