import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { getErrorMessage } from '@/api/client';
import { changeOrderStatus, cancelOrder, getOrder } from '@/api/orders';
import { Button } from '@/components/Button';
import { ConfirmModal } from '@/components/ConfirmModal';
import { Loading, ErrorMessage } from '@/components/States';
import { StatusBadge } from '@/components/StatusBadge';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { colors, spacing, radius } from '@/theme';
import { Order } from '@/types';
import { formatDateTime, formatPrice } from '@/utils/format';
import { STATUS_FLOW, STATUS_INFO, getNextStatus } from '@/utils/orders';

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isAdmin } = useAuth();
  const { showToast } = useToast();

  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      setOrder(await getOrder(Number(id)));
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (error) return <ErrorMessage message={error} onRetry={load} />;
  if (!order) return <Loading text="Cargando pedido..." />;

  const nextStatus = getNextStatus(order.status);
  const currentStep = STATUS_FLOW.indexOf(order.status);
  const cancelled = order.status === 'cancelled';

  /** Admin: moves the order to the next step (pending -> preparing -> ready -> delivered). */
  async function advance() {
    if (!order || !nextStatus) return;
    setProcessing(true);
    try {
      await changeOrderStatus(order.id, nextStatus);
      showToast(`Pedido #${order.id}: ${STATUS_INFO[nextStatus].text}`);
      await load();
    } catch (e) {
      showToast(getErrorMessage(e), 'error');
    } finally {
      setProcessing(false);
    }
  }

  async function cancel() {
    if (!order) return;
    setProcessing(true);
    try {
      // The customer uses "cancel" (pending only); the admin can cancel at any step
      if (isAdmin) await changeOrderStatus(order.id, 'cancelled');
      else await cancelOrder(order.id);
      showToast(`El pedido #${order.id} se canceló y el inventario se regresó`);
      setConfirmCancel(false);
      await load();
    } catch (e) {
      setConfirmCancel(false);
      showToast(getErrorMessage(e), 'error');
    } finally {
      setProcessing(false);
    }
  }

  const canCancel = isAdmin ? !cancelled && order.status !== 'delivered' : order.status === 'pending';

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Stack.Screen options={{ title: `Pedido #${order.id}` }} />

      <View style={styles.header}>
        <View style={styles.flex}>
          <Text style={styles.title}>Pedido #{order.id}</Text>
          <Text style={styles.date}>{formatDateTime(order.created)}</Text>
          {isAdmin && <Text style={styles.date}>Cliente: {order.user}</Text>}
        </View>
        <StatusBadge status={order.status} />
      </View>

      {/* Order progress line */}
      {cancelled ? (
        <View style={styles.cancelled}>
          <Ionicons name="close-circle" size={20} color={colors.textMuted} />
          <Text style={styles.cancelledText}>Este pedido se canceló. El inventario ya se regresó.</Text>
        </View>
      ) : (
        <View style={styles.card}>
          {STATUS_FLOW.map((step, i) => {
            const done = i <= currentStep;
            return (
              <View key={step} style={styles.step}>
                <View style={[styles.stepDot, done && styles.dotDone]}>
                  {done && <Ionicons name="checkmark" size={14} color={colors.white} />}
                </View>
                <Text style={[styles.stepText, done && styles.stepTextDone]}>{STATUS_INFO[step].text}</Text>
              </View>
            );
          })}
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.subtitle}>Lo que se pidió</Text>
        {order.items.map((item, i) => (
          <View key={item.id} style={[styles.line, i > 0 && styles.withBorder]}>
            <View style={styles.flex}>
              <Text style={styles.type}>{item.type === 'food' ? 'Menú' : 'Tienda'}</Text>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.detail}>
                {item.quantity} x {formatPrice(item.unit_price)}
              </Text>
            </View>
            <Text style={styles.subtotal}>{formatPrice(item.subtotal)}</Text>
          </View>
        ))}
        <View style={styles.total}>
          <Text style={styles.totalText}>Total</Text>
          <Text style={styles.totalPrice}>{formatPrice(order.total)}</Text>
        </View>
      </View>

      {order.note ? (
        <View style={styles.note}>
          <Ionicons name="chatbox-ellipses-outline" size={18} color={colors.textOnAccent} />
          <Text style={styles.noteText}>{order.note}</Text>
        </View>
      ) : null}

      {isAdmin && nextStatus && (
        <Button
          text={`Marcar como "${STATUS_INFO[nextStatus].text}"`}
          icon="arrow-forward-circle-outline"
          variant="secondary"
          loading={processing && !confirmCancel}
          onPress={advance}
        />
      )}

      {canCancel && (
        <Button
          text="Cancelar pedido"
          icon="close-circle-outline"
          variant="danger"
          onPress={() => setConfirmCancel(true)}
        />
      )}

      <ConfirmModal
        visible={confirmCancel}
        title="¿Cancelar este pedido?"
        message="El pedido quedará cancelado y los productos regresarán al inventario."
        confirmText="Sí, cancelar"
        icon="close-circle-outline"
        loading={processing}
        onConfirm={cancel}
        onCancel={() => setConfirmCancel(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    padding: spacing.l,
    gap: spacing.l,
    paddingBottom: spacing.xl * 2,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.m,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
  },
  date: {
    fontSize: 14,
    color: colors.textMuted,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.l,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.l,
    gap: spacing.s,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotDone: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  stepText: {
    fontSize: 15,
    color: colors.textMuted,
  },
  stepTextDone: {
    color: colors.text,
    fontWeight: '700',
  },
  cancelled: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    padding: spacing.m,
    borderRadius: radius.m,
    backgroundColor: '#ECEDEF',
  },
  cancelledText: {
    flex: 1,
    fontSize: 14,
    color: colors.textMuted,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    paddingVertical: spacing.s,
  },
  withBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  type: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.secondary,
    textTransform: 'uppercase',
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  detail: {
    fontSize: 13,
    color: colors.textMuted,
  },
  subtotal: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  total: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.m,
    borderTopWidth: 2,
    borderTopColor: colors.text,
  },
  totalText: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  totalPrice: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.primary,
  },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    padding: spacing.m,
    borderRadius: radius.m,
    backgroundColor: colors.accentSoft,
  },
  noteText: {
    flex: 1,
    fontSize: 14,
    color: colors.textOnAccent,
  },
});
