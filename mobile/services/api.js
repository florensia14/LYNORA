
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = (
  process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:5000/api'
).replace(/\/+$/, '');

export async function getAuthToken() {
  return AsyncStorage.getItem('lynora_token');
}

export async function apiRequest(path, options = {}) {
  const token = options.auth === false ? null : await getAuthToken();

  const headers = {
    Accept: 'application/json',
    ...(options.body !== undefined
      ? { 'Content-Type': 'application/json' }
      : {}),
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const url = `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;

    console.log('[LYNORA API] Request:', url);

    const response = await fetch(url, {
      method: options.method || 'GET',
      headers,
      ...(options.body !== undefined
        ? {
            body:
              typeof options.body === 'string'
                ? options.body
                : JSON.stringify(options.body),
          }
        : {}),
      signal: controller.signal,
    });

    const result = await response.json().catch(() => ({}));

    console.log('[LYNORA API] Response:', response.status, result);

    if (!response.ok) {
      const error = new Error(
        result.message || `Request failed (${response.status})`
      );

      error.status = response.status;
      error.code = result.code;
      error.data = result;

      throw error;
    }

    return result;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error(
        'Koneksi ke server timeout. Periksa koneksi dan alamat API.'
      );
    }

    if (
      error instanceof TypeError ||
      error.message === 'Network request failed'
    ) {
      throw new Error(
        'Tidak dapat terhubung ke server LYNORA. Periksa alamat API dan koneksi jaringan.'
      );
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export { API_BASE_URL };
