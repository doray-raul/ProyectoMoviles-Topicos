import { request } from './client';
import { OrderStatus, Stats, Page, Order } from '@/types';

/** An order line: it has a presentation (food) OR a variant (merch), never both. */
export type NewOrderLine = { presentation: number; quantity: number } | { product_variant: number; quantity: number };

/**
 * POST /api/orders/
 * The API calculates the prices and deducts the inventory; if something is short, it returns an error
 * and nothing is saved (everything happens inside a Django transaction).
 */
export function createOrder(items: NewOrderLine[], note: string) {
  return request<Order>('/orders/', { method: 'POST', body: { items, note: note.trim() } });
}

/** GET /api/orders/ -> customers only see their own; the admin sees all of them. */
export function listOrders(page: number, pageSize: number, status: OrderStatus | null) {
  return request<Page<Order>>('/orders/', {
    params: { page, page_size: pageSize, status },
  });
}

export function getOrder(id: number) {
  return request<Order>(`/orders/${id}/`);
}

/** Custom action: the customer cancels their order (only while it is pending). Returns the stock. */
export function cancelOrder(id: number) {
  return request<{ id: number; status: OrderStatus }>(`/orders/${id}/cancel/`, { method: 'POST' });
}

/** Custom action (admin only): moves the order to another status (preparing, ready, delivered...). */
export function changeOrderStatus(id: number, status: OrderStatus) {
  return request<{ id: number; status: OrderStatus }>(`/orders/${id}/change_status/`, {
    method: 'POST',
    body: { status },
  });
}

/** GET /api/stats/ (admin only) -> business summary for the dashboard. */
export function getStats() {
  return request<Stats>('/stats/');
}
