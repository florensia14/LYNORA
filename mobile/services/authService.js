import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiRequest } from './api';

const TOKEN_KEY = 'lynora_token';
const USER_KEY = 'lynora_user';
const PENDING_KEY = 'lynora_registration_pending';
export const NAVIGATION_STATE_KEY = 'lynora_navigation_state';

export async function login(email, password) {
  const result = await apiRequest('/auth/login', {
    method: 'POST', auth: false, body: { email: email.trim(), password },
  });

  if (!result.token) throw new Error('Token tidak ditemukan dari server.');
  if (result.user?.role !== 'customer') {
    throw new Error('Aplikasi Mobile LYNORA hanya tersedia untuk Customer. Silakan gunakan Web untuk akun Organizer atau Super Admin.');
  }

  await AsyncStorage.multiSet([
    [TOKEN_KEY, result.token],
    [USER_KEY, JSON.stringify(result.user)],
  ]);
  return result;
}

export async function register({ name, email, phone, password }) {
  return apiRequest('/auth/register', {
    method: 'POST', auth: false, body: { name: name.trim(), email: email.trim(), phone: phone.trim(), password },
  });
}

export async function getMe() {
  const result = await apiRequest('/auth/me');
  if (result.user?.role !== 'customer') {
    await logout();
    throw new Error('Aplikasi Mobile LYNORA hanya tersedia untuk Customer.');
  }
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(result.user));
  return result.user;
}

export async function checkRegistrationStatus(email, phone) {
  const query = `?email=${encodeURIComponent(email.trim())}&phone=${encodeURIComponent(phone.trim())}`;
  return apiRequest(`/auth/registration-status${query}`, { auth: false });
}

export async function savePendingRegistration(value) {
  await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(value));
}

export async function getPendingRegistration() {
  const value = await AsyncStorage.getItem(PENDING_KEY);
  return value ? JSON.parse(value) : null;
}

export async function clearPendingRegistration() {
  await AsyncStorage.removeItem(PENDING_KEY);
}

export async function getMeFromStorage() {
  const saved = await AsyncStorage.getItem(USER_KEY);
  return saved ? JSON.parse(saved) : null;
}

export async function logout() {
  await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY, NAVIGATION_STATE_KEY]);
}
