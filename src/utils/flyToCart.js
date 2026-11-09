// "Added to cart" animation: a small copy of the product photo arcs from where it was
// added into the cart (navbar icon, or the floating checkout button on the price list),
// then the cart gives a little bounce. Pure DOM + Web Animations, no extra library.
// Respects "reduce motion" (only the bounce runs) and never throws.

const isVisible = (el) => {
  const r = el.getBoundingClientRect();
  return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < window.innerHeight && getComputedStyle(el).visibility !== 'hidden';
};

/** The visible cart target closest to the bottom-right (sticky checkout button wins when shown). */
function findTarget() {
  const all = [...document.querySelectorAll('[data-cart-target]')].filter(isVisible);
  return all.find((el) => el.dataset.cartTarget === 'sticky') || all[0] || null;
}

function bump(el) {
  el?.animate?.([{ transform: 'scale(1)' }, { transform: 'scale(1.22)' }, { transform: 'scale(0.95)' }, { transform: 'scale(1)' }], { duration: 420, easing: 'ease-out' });
}

/**
 * @param {Element} from  element the item came from (product image or the + button)
 * @param {string} [src]  image to fly; defaults to the first <img> inside/near `from`
 */
export function flyToCart(from, src) {
  try {
    if (typeof window === 'undefined' || !from) return;
    // The sticky checkout button may appear only after this click: look again shortly.
    requestAnimationFrame(() => {
      const target = findTarget();
      if (!target) return;
      const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      if (reduce) { bump(target); return; }

      const img = src || (from.tagName === 'IMG' ? from.currentSrc || from.src : from.querySelector?.('img')?.src);
      const a = from.getBoundingClientRect();
      const b = target.getBoundingClientRect();
      const size = 56;
      const ghost = document.createElement(img ? 'img' : 'div');
      if (img) { ghost.src = img; ghost.alt = ''; }
      Object.assign(ghost.style, {
        position: 'fixed', left: `${a.left + a.width / 2 - size / 2}px`, top: `${a.top + a.height / 2 - size / 2}px`,
        width: `${size}px`, height: `${size}px`, borderRadius: '9999px', objectFit: 'cover', zIndex: 9999, pointerEvents: 'none',
        background: img ? '#fff' : '#7A1F2B', boxShadow: '0 8px 24px rgba(122,31,43,.45)', border: '2px solid #fff',
      });
      ghost.setAttribute('aria-hidden', 'true');
      document.body.appendChild(ghost);

      const dx = b.left + b.width / 2 - (a.left + a.width / 2);
      const dy = b.top + b.height / 2 - (a.top + a.height / 2);
      const lift = Math.min(160, Math.abs(dx) * 0.25 + 60); // arc height
      const anim = ghost.animate([
        { transform: 'translate(0,0) scale(1)', opacity: 1 },
        { transform: `translate(${dx * 0.45}px, ${dy * 0.45 - lift}px) scale(0.85)`, opacity: 1, offset: 0.45 },
        { transform: `translate(${dx}px, ${dy}px) scale(0.25)`, opacity: 0.6 },
      ], { duration: 750, easing: 'cubic-bezier(.45,.05,.55,.95)' });
      const done = () => { ghost.remove(); bump(target); };
      anim.onfinish = done; anim.oncancel = done;
    });
  } catch {
    /* decorative only */
  }
}
