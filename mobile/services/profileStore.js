import AsyncStorage from '@react-native-async-storage/async-storage';

const USER_KEY = 'lynora_user';
const listeners = new Set();

export async function getStoredProfile() {
  try {
    const raw = await AsyncStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn('[LYNORA Profile] Could not read cached user:', error?.message || error);
    return null;
  }
}

export async function updateStoredProfile(user) {
  if (!user || typeof user !== 'object') return;
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  listeners.forEach((listener) => {
    try { listener(user); } catch (error) {
      console.warn('[LYNORA Profile] Listener failed:', error?.message || error);
    }
  });
}

export function subscribeToProfile(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
