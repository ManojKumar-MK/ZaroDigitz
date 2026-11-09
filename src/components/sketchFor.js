/** True when the product has a real photo (not the built-in placeholder). */
export const hasPhoto = (p) => Boolean(p?.image) && !String(p.image).endsWith('card-placeholder.svg');
