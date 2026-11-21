import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getErrorMessage } from '@/api/client';
import { getStats } from '@/api/orders';
import { adjustStock, listLowStockVariants } from '@/api/store';
import { Button } from '@/components/Button';
import { Loading, ErrorMessage } from '@/components/States';
import { useToast } from '@/context/ToastContext';
import { colors, spacing, radius } from '@/theme';
import { Stats, FullVariant } from '@/types';
import { formatPrice } from '@/utils/format';
import { STATUS_FLOW, STATUS_INFO } from '@/utils/orders';

/** Small card with a big number (metric). */
function Metric({ title, value, icon, color }: {
  title: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}) {
  return (
    <View style={styles.metric}>
      <Ionicons name={icon} size={22} color={color} />
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricTitle}>{title}</Text>
    </View>
  );
}

/**
 * Business dashboard (admin only). It brings together in one screen:
 * - GET /api/stats/ -> orders by status, revenue, best sellers and stock alerts.
 * - GET /api/store/variants/low_stock/ -> which merch needs restocking (with a button to do it).
 */
export default function DashboardScreen() {
  const { showToast } = useToast();
  const [data, setData] = useState<Stats | null>(null);
  const [lowStock, setLowStock] = useState<FullVariant[]>([]);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      // Both requests are independent, so they run at the same time
      const [stats, variants] = await Promise.all([getStats(), listLowStockVariants()]);
      setData(stats);
      setLowStock(variants);
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function reload() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  async function restock(variant: FullVariant) {
    try {
      const { stock } = await adjustStock(variant.id, 10);
      showToast(`Se sumaron 10 piezas. Ahora hay ${stock}.`);
      await load();
    } catch (e) {
      showToast(getErrorMessage(e), 'error');
    }
  }

  if (error) return <ErrorMessage message={error} onRetry={load} />;
  if (!data) return <Loading text="Calculando números del negocio..." />;

  const totalOrders = Object.values(data.orders_by_status).reduce((a, b) => a + b, 0);
  const activeOrders = data.orders_by_status.pending + data.orders_by_status.preparing + data.orders_by_status.ready;
  const maxSold = Math.max(1, ...data.best_sellers.map((m) => m.sold));

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={reload} />}
    >
      <View style={styles.header}>
        <View style={styles.flex}>
          <Text style={styles.title}>Panel del negocio</Text>
          <Text style={styles.help}>Resumen en tiempo real de pedidos, ventas e inventario.</Text>
        </View>
        <Button text="Actualizar" icon="refresh" variant="outline" small onPress={reload} loading={refreshing} />
      </View>

      <View style={styles.metrics}>
        <Metric title="Ingresos (entregados)" value={formatPrice(data.delivered_revenue)} icon="cash-outline" color={colors.success} />
        <Metric title="Pedidos activos" value={activeOrders} icon="time-outline" color={colors.primary} />
        <Metric title="Pedidos en total" value={totalOrders} icon="receipt-outline" color={colors.secondary} />
      </View>

      {/* Orders by status: each row opens the filtered list */}
      <View style={styles.card}>
        <Text style={styles.subtitle}>Pedidos por estado</Text>
        {[...STATUS_FLOW, 'cancelled' as const].map((status) => (
          <View key={status} style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: STATUS_INFO[status].color }]} />
            <Text style={styles.flex}>{STATUS_INFO[status].text}</Text>
            <Text style={styles.statusValue}>{data.orders_by_status[status]}</Text>
          </View>
        ))}
        <Button
          text="Ir a los pedidos"
          icon="receipt-outline"
          variant="secondary"
          small
          onPress={() => router.navigate('/orders')}
        />
      </View>

      {/* Best sellers with proportional bars */}
      <View style={styles.card}>
        <Text style={styles.subtitle}>Lo más vendido</Text>
        {data.best_sellers.length === 0 ? (
          <Text style={styles.help}>Aún no hay ventas. Aquí aparecerá el top 5 cuando lleguen pedidos.</Text>
        ) : (
          data.best_sellers.map((m, i) => (
            <View key={m.name} style={styles.soldItem}>
              <View style={styles.soldTexts}>
                <Text style={styles.soldName} numberOfLines={1}>
                  {i + 1}. {m.name}
                </Text>
                <Text style={styles.soldValue}>{m.sold} pzas</Text>
              </View>
              <View style={styles.barTrack}>
                <View style={[styles.bar, { width: `${(m.sold / maxSold) * 100}%` as const }]} />
              </View>
            </View>
          ))
        )}
      </View>

      {/* Inventory alerts */}
      <View style={styles.card}>
        <Text style={styles.subtitle}>Alertas de inventario</Text>
        <View style={styles.alerts}>
          <View style={[styles.alert, data.low_stock_supplies > 0 && styles.alertActive]}>
            <Text style={styles.alertValue}>{data.low_stock_supplies}</Text>
            <Text style={styles.alertText}>insumos de cocina por resurtir</Text>
          </View>
          <View style={[styles.alert, data.low_stock_merch > 0 && styles.alertActive]}>
            <Text style={styles.alertValue}>{data.low_stock_merch}</Text>
            <Text style={styles.alertText}>productos de la tienda con poco stock</Text>
          </View>
        </View>

        {lowStock.length > 0 && (
          <>
            <Text style={styles.help}>Toca "Sumar 10" cuando llegue mercancía de un producto.</Text>
            {lowStock.map((v) => (
              <View key={v.id} style={styles.stockRow}>
                <Pressable style={styles.flex} onPress={() => router.push(`/product/${v.product}`)}>
                  <Text style={styles.stockName}>{v.sku}</Text>
                  <Text style={styles.stockDetail}>
                    {v.name} · quedan {v.stock} (mínimo {v.min_stock})
                  </Text>
                </Pressable>
                <Button text="Sumar 10" icon="add" variant="secondary" small onPress={() => restock(v)} />
              </View>
            ))}
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    width: '100%',
    maxWidth: 900,
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
    alignItems: 'center',
    gap: spacing.m,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
  },
  help: {
    fontSize: 13,
    color: colors.textMuted,
  },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.m,
  },
  metric: {
    flexGrow: 1,
    flexBasis: 160,
    padding: spacing.l,
    gap: 4,
    borderRadius: radius.l,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
  },
  metricTitle: {
    fontSize: 13,
    color: colors.textMuted,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.l,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.l,
    gap: spacing.m,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  soldItem: {
    gap: 4,
  },
  soldTexts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.m,
  },
  soldName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  soldValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  barTrack: {
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primarySoft,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  alerts: {
    flexDirection: 'row',
    gap: spacing.m,
  },
  alert: {
    flex: 1,
    padding: spacing.m,
    borderRadius: radius.m,
    backgroundColor: colors.successSoft,
  },
  alertActive: {
    backgroundColor: colors.errorSoft,
  },
  alertValue: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
  },
  alertText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    paddingTop: spacing.s,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  stockName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  stockDetail: {
    fontSize: 13,
    color: colors.error,
  },
});
