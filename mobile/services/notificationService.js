import { apiRequest } from './api';

export function mapNotification(row) {
  const type = String(row?.type || 'announcement').toLowerCase();
  let category = 'ANNOUNCEMENT';
  let kind = 'promo';
  if (type === 'ticket') { category = 'TICKET ISSUED'; kind = 'ticket'; }
  else if (type === 'payment') { category = 'PAYMENT CONFIRMED'; kind = 'system'; }
  else if (type === 'schedule' || type === 'cancellation') { category = 'STAGE SCHEDULE'; kind = 'reminder'; }
  else if (type === 'support') { category = 'SUPPORT'; kind = 'support'; }
  else if (type === 'announcement') { category = 'ANNOUNCEMENT'; kind = 'promo'; }

  const createdAt = row?.created_at || new Date().toISOString();
  return {
    id: Number(row.id),
    title: row.title || 'LYNORA Update',
    message: row.message || '',
    created_at: createdAt,
    time: formatRelativeTime(createdAt),
    type: kind,
    category,
    unread: !(row.is_read === true || row.is_read === 1 || row.is_read === '1'),
    event_id: row.event_id == null ? null : Number(row.event_id),
    ticket_id: row.ticket_id == null ? null : Number(row.ticket_id),
    event_name: row.event_name || null,
    poster_url: row.poster_url || null,
    start_date: row.start_date || null,
    venue_name: row.venue_name || null,
    venue_address: row.venue_address || null,
  };
}

export function formatRelativeTime(value) {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return '-';
  const minutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

export async function fetchNotifications() {
  const result = await apiRequest('/notifications');
  const rows = Array.isArray(result?.notifications) ? result.notifications
    : Array.isArray(result?.data) ? result.data : [];
  return rows.map(mapNotification).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}

export async function markNotificationRead(id) {
  return apiRequest(`/notifications/${id}/read`, { method: 'PATCH' });
}

export async function markAllNotificationsRead() {
  return apiRequest('/notifications/read-all', { method: 'PATCH' });
}

export async function fetchUpcomingTicket() {
  const result = await apiRequest('/tickets/my-tickets');
  const rows = Array.isArray(result?.data) ? result.data : [];
  const now = Date.now();
  return rows.filter((row) => {
    const start = new Date(row.start_date).getTime();
    return String(row.ticket_status || '').toLowerCase() === 'valid'
      && String(row.order_status || '').toLowerCase() === 'paid'
      && Number.isFinite(start) && start > now;
  }).sort((a, b) => new Date(a.start_date) - new Date(b.start_date))[0] || null;
}
