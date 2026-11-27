import { apiRequest } from './api';
import { resolveImageUrl } from './homeService';

function unwrapTickets(payload) {
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.tickets)) return payload.tickets;
  if (Array.isArray(payload?.data?.tickets)) return payload.data.tickets;
  return [];
}

/**
 * Fetch tickets belonging to the authenticated customer.
 * Mirrors the web endpoint: GET /api/tickets/my-tickets
 */
export async function fetchMyTickets() {
  const payload = await apiRequest('/tickets/my-tickets');
  const rows = unwrapTickets(payload);

  return rows.map((ticket) => ({
    ...ticket,
    ticket_id: Number(ticket.ticket_id),
    order_id: ticket.order_id == null ? null : Number(ticket.order_id),
    ticket_code: String(ticket.ticket_code || ''),
    ticket_status: String(ticket.ticket_status || '').toLowerCase(),
    order_code: String(ticket.order_code || ''),
    event_id: Number(ticket.event_id),
    event_name: String(ticket.event_name || 'Untitled concert'),
    start_date: ticket.start_date || '',
    end_date: ticket.end_date || '',
    category_name: String(ticket.category_name || 'General Admission'),
    poster_url: resolveImageUrl(ticket.poster_url),
    venue_name: ticket.venue_name || '',
    venue_address: ticket.venue_address || '',
    quantity: Number(ticket.quantity || 1),
  })).filter((ticket) => Number.isFinite(ticket.ticket_id));
}
