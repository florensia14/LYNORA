import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@lynora/login-preferences';

export async function loadLoginPreferences() {
  const savedPreferences = await AsyncStorage.getItem(STORAGE_KEY);
  if (!savedPreferences) {
    return { rememberMe: false, email: '' };
  }

  const preferences = JSON.parse(savedPreferences);
  if (
    !preferences ||
    typeof preferences !== 'object' ||
    Array.isArray(preferences)
  ) {
    throw new Error('Preferensi login tersimpan tidak valid.');
  }

  return {
    rememberMe: preferences.rememberMe === true,
    email: typeof preferences.email === 'string' ? preferences.email : '',
  };
}

export async function saveLoginPreferences(rememberMe, email) {
  if (!rememberMe) {
    await AsyncStorage.removeItem(STORAGE_KEY);
    return;
  }

  await AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ rememberMe: true, email: email.trim() }),
  );
}
