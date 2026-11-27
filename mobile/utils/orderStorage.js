import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@lynora/orders';

export async function loadOrders(fallbackOrders) {
  const storedOrders = await AsyncStorage.getItem(STORAGE_KEY);
  if (!storedOrders) {
    return fallbackOrders;
  }

  const parsedOrders = JSON.parse(storedOrders);
  if (!Array.isArray(parsedOrders)) {
    throw new Error('Data pesanan tersimpan tidak valid.');
  }
  return parsedOrders;
}

export async function saveOrders(orders) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
}

export async function updateStoredOrder(orderId, changes, fallbackOrders) {
  const orders = await loadOrders(fallbackOrders);
  let foundOrder = false;
  const updatedOrders = orders.map((order) => {
    if (String(order.id) !== String(orderId)) {
      return order;
    }

    foundOrder = true;
    return { ...order, ...changes };
  });

  if (!foundOrder) {
    throw new Error(`Pesanan #${orderId} tidak ditemukan.`);
  }

  await saveOrders(updatedOrders);
  return updatedOrders;
}
