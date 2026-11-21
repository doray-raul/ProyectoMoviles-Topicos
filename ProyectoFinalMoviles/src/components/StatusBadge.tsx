import { StyleSheet, Text } from 'react-native';

import { OrderStatus } from '@/types';
import { STATUS_INFO } from '@/utils/orders';

/** Colored label with the status of an order. */
export function StatusBadge({ status }: { status: OrderStatus }) {
  const info = STATUS_INFO[status];
  return <Text style={[styles.badge, { color: info.color, backgroundColor: info.background }]}>{info.text}</Text>;
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    fontSize: 12,
    fontWeight: '800',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: 'hidden',
  },
});
