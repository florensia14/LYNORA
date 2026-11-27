import { apiRequest } from './api';
import { getMe } from './authService';
import { getStoredProfile, updateStoredProfile } from './profileStore';

export async function getProfile() {
  try {
    const result = await apiRequest('/profile/me');
    const user = result?.user || result?.data?.user || result?.data || result;
    if (user && typeof user === 'object') {
      await updateStoredProfile(user);
      return user;
    }
    return await getMe();
  } catch (error) {
    // Fall back to /auth/me if the profile endpoint is unavailable,
    // then use the cached user only if the network is unavailable.
    try {
      const user = await getMe();
      await updateStoredProfile(user);
      return user;
    } catch (authError) {
      const cached = await getStoredProfile();
      if (cached) return cached;
      throw error || authError;
    }
  }
}

export async function saveProfile(values) {
  const result = await apiRequest('/profile/me', {
    method: 'PUT',
    body: {
      name: values.name.trim(),
      email: values.email.trim(),
      phone: (values.phone || '').trim(),
    },
  });

  const user = result?.user || result?.data?.user || result?.data || result;
  if (!user || typeof user !== 'object') {
    throw new Error('Data profil dari server tidak valid.');
  }

  await updateStoredProfile(user);
  return user;
}
