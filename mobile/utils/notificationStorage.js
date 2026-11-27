import { fetchNotifications } from '../services/notificationService';

let current = [];
const listeners = new Set();

export function getNotificationSnapshot() {
  return current;
}

export function subscribeToNotificationChanges(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function publishNotifications(items) {
  current = Array.isArray(items) ? items : [];
  listeners.forEach((listener) => listener(current));
}

export async function refreshNotifications() {
  const items = await fetchNotifications();
  publishNotifications(items);
  return items;
}

export function updateNotificationRead(id) {
  publishNotifications(current.map((item) => item.id === id ? { ...item, unread: false } : item));
}

export function updateAllNotificationsRead() {
  publishNotifications(current.map((item) => ({ ...item, unread: false })));
}
