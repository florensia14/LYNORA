import AsyncStorage from '@react-native-async-storage/async-storage';

export async function getAuthToken() {
  return AsyncStorage.getItem('lynora_token');
}

export async function apiRequest(path, options = {}) {
  return Promise.resolve({
    path,
    method: options.method || 'GET',
    demo: true,
  });
}
