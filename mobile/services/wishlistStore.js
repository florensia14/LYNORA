// Shared in-memory wishlist state for Home, Explore, Wishlist and Concert Detail.
let wishlistIds = [];
const listeners = new Set();

function normalizeIds(ids) {
  return [...new Set((Array.isArray(ids) ? ids : [])
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value) && value > 0))];
}

export function getWishlistIds() {
  return [...wishlistIds];
}

export function publishWishlistIds(ids) {
  wishlistIds = normalizeIds(ids);
  listeners.forEach((listener) => {
    try {
      listener([...wishlistIds]);
    } catch (error) {
      console.warn('[LYNORA Wishlist] Listener failed:', error?.message || error);
    }
  });
  return [...wishlistIds];
}

export function subscribeWishlist(listener) {
  listeners.add(listener);
  listener([...wishlistIds]);
  return () => listeners.delete(listener);
}
