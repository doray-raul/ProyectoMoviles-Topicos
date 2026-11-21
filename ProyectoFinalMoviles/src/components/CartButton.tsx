import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useCart } from '@/context/CartContext';
import { colors, spacing } from '@/theme';
import { formatPrice } from '@/utils/format';

/** Header button: "Carrito" with the number of pieces. It is on every tab. */
export function HeaderCartButton() {
  const { totalPieces } = useCart();

  return (
    <Pressable
      onPress={() => router.push('/cart')}
      accessibilityRole="button"
      accessibilityLabel={`Ver carrito, ${totalPieces} piezas`}
      style={styles.header}
    >
      <Ionicons name="cart-outline" size={20} color={colors.white} />
      <Text style={styles.headerText}>Carrito</Text>
      {totalPieces > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{totalPieces}</Text>
        </View>
      )}
    </Pressable>
  );
}

/**
 * Bar shown at the bottom of the Menu and the Store when the cart has something,
 * so the next step ("Ver carrito") is always visible.
 */
export function CartBar() {
  const { totalPieces, totalPrice } = useCart();
  if (totalPieces === 0) return null;

  return (
    <View style={styles.barContainer}>
      <Pressable onPress={() => router.push('/cart')} accessibilityRole="button" style={styles.bar}>
        <View style={styles.barIcon}>
          <Ionicons name="cart" size={20} color={colors.primary} />
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{totalPieces}</Text>
          </View>
        </View>
        <Text style={styles.barText}>Ver carrito y hacer pedido</Text>
        <Text style={styles.barTotal}>{formatPrice(totalPrice)}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginRight: spacing.l,
    paddingHorizontal: spacing.m,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.darkLight,
  },
  headerText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '700',
  },
  badge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.textOnAccent,
  },
  barContainer: {
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.s,
    backgroundColor: colors.background,
  },
  bar: {
    width: '100%',
    maxWidth: 640,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    paddingVertical: spacing.m,
    paddingHorizontal: spacing.l,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  barIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.s,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: colors.white,
  },
  barText: {
    flex: 1,
    color: colors.white,
    fontSize: 15,
    fontWeight: '800',
  },
  barTotal: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '800',
  },
});
