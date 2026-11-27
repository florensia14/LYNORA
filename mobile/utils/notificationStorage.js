import AsyncStorage from '@react-native-async-storage/async-storage';
import { INITIAL_NOTIFICATIONS } from '../data/notifications';

const STORAGE_KEY = '@lynora/notifications';
const listeners = new Set();

export async function loadNotifications() {
  const storedNotifications = await AsyncStorage.getItem(STORAGE_KEY);
  if (!storedNotifications) {
    return INITIAL_NOTIFICATIONS.map((notification) => ({ ...notification }));
  }

  const notifications = JSON.parse(storedNotifications);
  if (!Array.isArray(notifications)) {
    throw new Error('Data notifikasi tersimpan tidak valid.');
  }
  return notifications;
}

export async function saveNotifications(notifications) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  listeners.forEach((listener) => listener(notifications));
}

export function subscribeToNotificationChanges(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
