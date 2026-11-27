import { apiRequest } from './api';

function unwrapEvent(payload) {
  if (!payload || typeof payload !== 'object') return null;
  return payload.event || payload.data?.event || payload.data || payload.result || payload;
}

export async function fetchConcertById(eventId) {
  const id = Number(eventId);
  if (!Number.isFinite(id) || id <= 0) throw new Error('ID konser tidak valid.');

  const payload = await apiRequest(`/events/${id}`, { auth: false });
  const event = unwrapEvent(payload);
  if (!event || event.id == null) throw new Error('Detail konser tidak ditemukan.');

  const artists = Array.isArray(event.artists) ? event.artists : [];
  const categories = Array.isArray(event.ticket_categories)
    ? event.ticket_categories
    : Array.isArray(event.ticketCategories)
      ? event.ticketCategories
      : [];

  return {
    ...event,
    id: Number(event.id),
    name: String(event.name || event.title || 'Untitled concert'),
    title: String(event.name || event.title || 'Untitled concert'),
    poster_url: event.hero_image_url || event.banner_url || event.poster_url || event.poster_image_url || event.event_poster || event.image_url || event.poster?.url || event.poster || event.image?.url || event.image || null,
    hero_image_url: event.hero_image_url || null,
    banner_url: event.banner_url || null,
    image: event.hero_image_url || event.banner_url || event.poster_url || event.poster_image_url || event.event_poster || event.image_url || event.poster?.url || event.poster || event.image?.url || event.image || null,
    category_name: event.category_name || event.category?.name || event.category || 'Live Concert',
    category: event.category_name || event.category?.name || event.category || 'Live Concert',
    venue_name: event.venue_name || event.venue?.name || '',
    venue_address: event.venue_address || event.venue?.address || '',
    location: [event.venue_name || event.venue?.name, event.venue_address || event.venue?.address].filter(Boolean).join(', '),
    organizer_name: event.organizer_name || event.organizer?.name || '',
    organizer: event.organizer_name || event.organizer?.name || '',
    start_date: event.start_date || event.event_date || '',
    date: event.start_date || event.event_date || '',
    price: Number(event.starting_price ?? event.price ?? event.min_price) || null,
    artists,
    ticket_categories: categories.map((ticket) => {
      const quota = Number(ticket.quota ?? ticket.total_quota ?? 0);
      const sold = Number(ticket.sold ?? ticket.total_sold ?? 0);
      const rawRemaining = ticket.remaining ?? ticket.available_quantity ?? ticket.stock;
      const parsedRemaining = Number(rawRemaining);
      const remaining = rawRemaining != null && Number.isFinite(parsedRemaining)
        ? parsedRemaining
        : Math.max(0, quota - sold);
      return {
        ...ticket,
        id: Number(ticket.id),
        name: String(ticket.name || ticket.category_name || 'Ticket'),
        price: Number(ticket.price ?? ticket.amount ?? 0),
        quota,
        sold,
        remaining: Number.isFinite(remaining) ? Math.max(0, remaining) : 0,
        benefit: ticket.benefit || ticket.description || '',
      };
    }),
    schedule: Array.isArray(event.schedule) ? event.schedule : [],
  };
}
