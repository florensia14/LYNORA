import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@lynora/settings';

export const DEFAULT_SETTINGS = {
  twoFactorEnabled: true,
  defaultPaymentMethod: 'QRIS',
  otherDevicesSignedOut: false,
  accountStatus: 'active',
  lastPasswordChangedAt: null,
};

export async function loadSettings() {
  const savedSettings = await AsyncStorage.getItem(STORAGE_KEY);
  if (!savedSettings) {
    return { ...DEFAULT_SETTINGS };
  }

  const parsedSettings = JSON.parse(savedSettings);
  if (
    !parsedSettings ||
    typeof parsedSettings !== 'object' ||
    Array.isArray(parsedSettings)
  ) {
    throw new Error('Pengaturan tersimpan tidak valid.');
  }

  return { ...DEFAULT_SETTINGS, ...parsedSettings };
}

export async function saveSettings(changes) {
  const currentSettings = await loadSettings();
  const updatedSettings = { ...currentSettings, ...changes };
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedSettings));
  return updatedSettings;
}

export async function clearSettings() {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
