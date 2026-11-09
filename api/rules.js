// Access rules, ported from firestore.rules. Every read and write goes through here.
// ctx = { admin: boolean }. Values in `after`/`patch` are plain JSON ({__ts} for timestamps).

const isStr = (v, max = Infinity) => typeof v === 'string' && v.length <= max;
const isMap = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

function isValidNewOrder(d) {
  return isMap(d)
    && ['orderNumber', 'status', 'customer', 'items', 'grandTotal'].every((k) => k in d)
    && d.status === 'new'
    && Array.isArray(d.items) && d.items.length > 0 && d.items.length <= 300
    && isMap(d.customer)
    && isStr(d.customer.name, 120)
    && isStr(d.customer.mobile, 20)
    && isNum(d.grandTotal) && d.grandTotal >= 0;
}

function isValidEnquiry(d) {
  return isMap(d) && isStr(d.message, 4000) && d.message.length > 0 && isStr(d.name, 120);
}

/** kind: 'get' (one document by id) | 'list' (a query). */
export function canRead(collection, id, ctx, kind) {
  if (ctx.admin) return true;
  switch (collection) {
    case 'products':
    case 'settings':
      return true;
    case 'productImages':
    case 'templates': // a design's personalisation layout (public, like the product itself)
    case 'tracking': // the id (order number + last 4 digits of the mobile) is the key
      return kind === 'get';
    case 'invoices': // unguessable token is the access control
      return kind === 'get' && String(id).length >= 20;
    default:
      return false;
  }
}

/**
 * op: 'create' | 'update' | 'delete'. `changed` = top-level keys whose value changes.
 * Returns true when allowed.
 */
export function canWrite(collection, id, op, { after, changed }, ctx) {
  if (ctx.admin) {
    if (collection === 'productImages' && op !== 'delete') return isStr(after?.dataUrl, 1_000_000);
    return true;
  }
  switch (collection) {
    case 'orders':
      if (op === 'create') return isValidNewOrder(after);
      // The storefront may only fill in the Telegram delivery result afterwards.
      if (op === 'update') return changed.every((k) => k === 'telegram' || k === 'updatedAt');
      return false;
    case 'enquiries':
      return op === 'create' && isValidEnquiry(after);
    case 'tracking':
      return op === 'create' && isMap(after) && isStr(after.orderNumber) && after.status === 'new' && !('shipment' in after) && !('photos' in after);
    case 'personalisations': // a customer's names and photos for a design: create only, id is an unguessable token
      return op === 'create' && String(id).length >= 20 && isMap(after) && isMap(after.values) && JSON.stringify(after).length < 3_000_000;
    case 'invoices':
      return op === 'create' && String(id).length >= 20 && isMap(after?.snapshot) && Array.isArray(after.snapshot.cart) && after.snapshot.cart.length <= 300;
    default:
      return false;
  }
}
