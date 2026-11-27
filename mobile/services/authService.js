import AsyncStorage from '@react-native-async-storage/async-storage';

export async function login(email, password) {
  const user = { id: 1, name: 'Naya Pratama', email, role: 'customer' };
  await AsyncStorage.setItem('lynora_user', JSON.stringify(user));
  return { user, token: 'frontend-demo-token' };
}

export async function register({ name, email, password }) {
  const user = { id: 1, name, email, role: 'customer' };
  await AsyncStorage.setItem('lynora_user', JSON.stringify(user));
  return { user };
}

export async function getMe() {
  const saved = await AsyncStorage.getItem('lynora_user');
  return saved ? JSON.parse(saved) : null;
}

export async function logout() {
  await AsyncStorage.multiRemove(['lynora_token', 'lynora_user']);
}
