import { colors } from '@/theme';
import { OrderStatus } from '@/types';

/** Text and colors used to show each order status. */
export const STATUS_INFO: Record<OrderStatus, { text: string; color: string; background: string }> = {
  pending: { text: 'Pendiente', color: '#8A6100', background: '#FFF3C4' },
  preparing: { text: 'Preparando', color: colors.secondary, background: colors.secondarySoft },
  ready: { text: 'Listo para recoger', color: colors.primaryDark, background: colors.primarySoft },
  delivered: { text: 'Entregado', color: colors.success, background: colors.successSoft },
  cancelled: { text: 'Cancelado', color: colors.textMuted, background: '#ECEDEF' },
};

/** Normal order a purchase goes through (cancelled is left out). */
export const STATUS_FLOW: OrderStatus[] = ['pending', 'preparing', 'ready', 'delivered'];

/** Next step of the flow, or null if it is finished. Used by the admin to advance the order. */
export function getNextStatus(status: OrderStatus): OrderStatus | null {
  const i = STATUS_FLOW.indexOf(status);
  if (i === -1 || i === STATUS_FLOW.length - 1) return null;
  return STATUS_FLOW[i + 1];
}
