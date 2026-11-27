import { apiRequest } from './api';
import { resolveImageUrl } from './homeService';

/**
 * Customer order history — same endpoint and response contract as LYNORA Web.
 *
 * GET /api/orders/my-orders
 * Authorization: Bearer <lynora_token>
 * Response: { success: true, data: ApiMyOrder[] }
 *
 * apiRequest automatically reads lynora_token from AsyncStorage and attaches
 * the Authorization header. Do not use demoOrders or local order storage here.
 */
export async function fetchMyOrders() {
  const result = await apiRequest('/orders/my-orders');

  if (!result?.success || !Array.isArray(result.data)) {
    throw new Error(
      result?.message || 'Format respons GET /orders/my-orders tidak sesuai.',
    );
  }

  return result.data.map((order) => ({
    ...order,
    poster_url: order.poster_url
      ? resolveImageUrl(order.poster_url)
      : null,
    quantity: Number(order.quantity || 0),
    total: Number(order.total || 0),
    order_id: Number(order.order_id),
  }));
}
