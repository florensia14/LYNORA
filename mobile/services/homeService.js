import { apiRequest, API_BASE_URL } from './api';

const API_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');

function unwrapList(payload, keys) {
  if (Array.isArray(payload)) return payload;
  for (const key of keys) if (Array.isArray(payload?.[key])) return payload[key];
  if (payload?.data && typeof payload.data === 'object') {
    for (const key of keys) if (Array.isArray(payload.data[key])) return payload.data[key];
  }
  return [];
}

export function resolveImageUrl(path) {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith('/images/') || path.startsWith('/icons/')) return path;
  return `${API_ORIGIN}${path.startsWith('/') ? '' : '/'}${path}`;
}

function normalizeConcert(row) {
  const artists = Array.isArray(row.artists) ? row.artists : [];
  return {
    ...row,
    id: Number(row.id),
    name: String(row.name || row.title || 'Untitled concert'),
    poster_url: resolveImageUrl(row.poster_url || row.poster_image_url || row.event_poster || row.poster_path || row.image_url || row.thumbnail_url || row.poster || row.cover_image || row.banner_url || row.banner_image),
    hero_image_url: resolveImageUrl(row.banner_url || row.banner_image || row.cover_image || row.poster_url || row.poster_image_url || row.event_poster || row.poster_path || row.image_url || row.thumbnail_url || row.poster),
    banner_url: resolveImageUrl(row.banner_url || row.banner_image || row.cover_image),
    image_url: resolveImageUrl(row.image_url || row.poster_url || row.poster_image_url || row.event_poster || row.poster),
    start_date: row.start_date || row.event_date || '',
    end_date: row.end_date || row.start_date || '',
    category_name: row.category_name || row.category?.name || 'Live Concert',
    venue_name: row.venue_name || row.venue?.name || '',
    venue_address: row.venue_address || row.venue?.address || '',
    artist: row.artist || artists.map((a) => a?.name).filter(Boolean).join(', '),
    artist_country: row.artist_country || artists.map((a) => a?.country).filter(Boolean).join(', '),
    price: Number(row.starting_price ?? row.price ?? row.min_price) || null,
  };
}

export async function fetchHomeConcerts() {
  const payload = await apiRequest('/events', { auth: false });
  return unwrapList(payload, ['events', 'data', 'results'])
    .filter((row) => row && row.id != null && (row.name || row.title))
    .map(normalizeConcert)
    .filter((row) => Number.isFinite(row.id));
}

export async function fetchHomeCategories() {
  const payload = await apiRequest('/categories/public', { auth: false });
  return unwrapList(payload, ['categories', 'data', 'results'])
    .map((row) => ({ ...row, name: String(row.name || '').trim() }))
    .filter((row) => row.name);
}

export async function fetchHomeWishlist() {
  const payload = await apiRequest('/wishlist');
  const rows = unwrapList(payload, ['wishlists', 'wishlist', 'data', 'items']);
  return rows.map((row) => Number(row.event_id ?? row.eventId ?? row.id)).filter(Number.isFinite);
}

export async function setHomeWishlist(eventId, alreadySaved) {
  return apiRequest(`/wishlist/${eventId}`, { method: alreadySaved ? 'DELETE' : 'POST' });
}
