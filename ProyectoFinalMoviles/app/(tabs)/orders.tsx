import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getErrorMessage } from '@/api/client';
import { listOrders } from '@/api/orders';
import { Chip } from '@/components/Chip';
import { Loading, EmptyState, ErrorMessage } from '@/components/States';
import { StatusBadge } from '@/components/StatusBadge';
import { Paginator } from '@/components/Paginator';
import { useSettings } from '@/context/SettingsContext';
import { useAuth } from '@/context/AuthContext';
import { colors, spacing, radius } from '@/theme';
import { OrderStatus, Page, Order } from '@/types';
import { formatDateTime, formatPrice } from '@/utils/format';
import { STATUS_INFO } from '@/utils/orders';

const FILTERS: (OrderStatus | null)[] = [null, 'pending', 'preparing', 'ready', 'delivered', 'cancelled'];

/**
 * Order list. The same screen works for both roles because the API already filters:
 * the customer only receives their own orders and the admin receives everyone's.
 */
export default function OrdersScreen() {
  const { isAdmin } = useAuth();
  const { settings } = useSettings();
  const [status, setStatus] = useState<OrderStatus | null>(null);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<Page<Order> | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setPage(1);
  }, [status, settings.pageSize]);

  const load = useCallback(async () => {
    setError('');
    try {
      setResult(await listOrders(page, settings.pageSize, status));
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }, [page, settings.pageSize, status]);

  // Reload when coming back to the tab, in case the admin changed the status of an order
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (error) return <ErrorMessage message={error} onRetry={load} />;
  if (!result) return <Loading text="Cargando pedidos..." />;

  const totalPages = Math.max(1, Math.ceil(result.count / settings.pageSize));

  return (
    <FlatList
      style={styles.screen}
      data={result.results}
      keyExtractor={(p) => String(p.id)}
      contentContainerStyle={styles.list}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.title}>{isAdmin ? 'Pedidos del negocio' : 'Mis pedidos'}</Text>
          <Text style={styles.help}>
            {isAdmin
              ? 'Aquí llegan los pedidos de todos los clientes. Entra a uno para avanzarlo de estado.'
              : 'Revisa en qué va cada pedido. Si sigue pendiente, todavía lo puedes cancelar.'}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {FILTERS.map((f) => (
              <Chip
                key={f ?? 'all'}
                text={f ? STATUS_INFO[f].text : 'Todos'}
                active={status === f}
                onPress={() => setStatus(f)}
              />
            ))}
          </ScrollView>
        </View>
      }
      renderItem={({ item }) => (
        <Pressable
          onPress={() => router.push(`/order/${item.id}`)}
          accessibilityRole="button"
          style={({ pressed }) => [styles.card, pressed && styles.pressed]}
        >
          <View style={styles.topRow}>
            <View>
              <Text style={styles.stepNumber}>Pedido #{item.id}</Text>
              <Text style={styles.date}>
                {formatDateTime(item.created)}
                {isAdmin ? ` · ${item.user}` : ''}
              </Text>
            </View>
            <StatusBadge status={item.status} />
          </View>

          <Text style={styles.summaryItems} numberOfLines={2}>
            {item.items.map((i) => `${i.quantity} x ${i.name}`).join(', ')}
          </Text>

          <View style={styles.bottomRow}>
            <Text style={styles.total}>{formatPrice(item.total)}</Text>
            <View style={styles.viewDetail}>
              <Text style={styles.viewDetailText}>Ver pedido</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.secondary} />
            </View>
          </View>
        </Pressable>
      )}
      ListEmptyComponent={
        <EmptyState
          icon="receipt-outline"
          title={status ? 'No hay pedidos con ese estado' : 'Todavía no hay pedidos'}
          text={isAdmin ? undefined : 'Agrega platillos o productos al carrito y presiona "Hacer pedido".'}
          buttonText={isAdmin || status ? undefined : 'Ver el menú'}
          onButtonPress={() => router.navigate('/')}
        />
      }
      ListFooterComponent={
        <Paginator page={page} totalPages={totalPages} totalItems={result.count} onChange={setPage} />
      }
    />
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    padding: spacing.l,
    flexGrow: 1,
  },
  separator: {
    height: spacing.m,
  },
  header: {
    gap: spacing.xs,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.text,
  },
  help: {
    fontSize: 14,
    color: colors.textMuted,
  },
  chips: {
    gap: spacing.s,
    paddingVertical: spacing.m,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.l,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.l,
    gap: spacing.s,
  },
  pressed: {
    opacity: 0.9,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.m,
  },
  stepNumber: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  date: {
    fontSize: 13,
    color: colors.textMuted,
  },
  summaryItems: {
    fontSize: 14,
    color: colors.text,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.s,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  total: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.primary,
  },
  viewDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewDetailText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.secondary,
  },
});
