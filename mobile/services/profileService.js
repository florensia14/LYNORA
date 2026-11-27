import AsyncStorage from '@react-native-async-storage/async-storage';
import { getMe } from './authService';

export async function getProfile() {
  try {
    return await getMe();
  } catch {
    const saved = await AsyncStorage.getItem('lynora_profile');
    return saved ? JSON.parse(saved) : null;
  }
}

export async function saveProfile(profile) {
  const saved = JSON.stringify(profile);
  await AsyncStorage.setItem('lynora_profile', saved);
  await AsyncStorage.setItem('lynora_user', saved);
  return profile;
}
