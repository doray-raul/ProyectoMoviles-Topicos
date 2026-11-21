import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, radius } from '@/theme';
import { Product } from '@/types';
import { formatPrice } from '@/utils/format';

interface Props {
  product: Product;
  onPress: () => void;
}

/** Store card: photo, name, price, available sizes and how many pieces are left. */
export function ProductCard({ product, onPress }: Props) {
  const soldOut = product.total_stock === 0 || !product.available;
  const options = product.variants.map((v) => v.name).join(' / ');

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Ver detalle de ${product.name}`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View>
        {product.image ? (
          <Image source={{ uri: product.image }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={[styles.image, styles.noImage]}>
            <Ionicons name="shirt-outline" size={34} color={colors.textMuted} />
            <Text style={styles.noImageText}>Sin foto</Text>
          </View>
        )}

        {product.featured && (
          <View style={styles.featured}>
            <Ionicons name="star" size={12} color={colors.textOnAccent} />
            <Text style={styles.featuredText}>Destacado</Text>
          </View>
        )}

        {soldOut && (
          <View style={styles.soldOut}>
            <Text style={styles.soldOutText}>{product.available ? 'Agotado' : 'No disponible'}</Text>
          </View>
        )}
      </View>

      <View style={styles.body}>
        <Text style={styles.category}>{product.category.name}</Text>
        <Text style={styles.name} numberOfLines={2}>
          {product.name}
        </Text>
        {options ? (
          <Text style={styles.options} numberOfLines={1}>
            {options}
          </Text>
        ) : null}

        <View style={styles.footer}>
          <Text style={styles.price}>
            {product.price_from !== null && <Text style={styles.fromLabel}>desde </Text>}
            {formatPrice(product.price_from)}
          </Text>
          <View style={styles.viewDetail}>
            <Text style={styles.viewDetailText}>Ver y comprar</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.secondary} />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.l,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  pressed: {
    opacity: 0.92,
  },
  image: {
    width: '100%',
    aspectRatio: 4 / 3,
    backgroundColor: '#EFEAE3',
  },
  noImage: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  noImageText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  featured: {
    position: 'absolute',
    top: spacing.s,
    left: spacing.s,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.accent,
    borderRadius: 999,
    paddingHorizontal: spacing.s,
    paddingVertical: 4,
  },
  featuredText: {
    color: colors.textOnAccent,
    fontSize: 11,
    fontWeight: '800',
  },
  soldOut: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(28, 29, 33, 0.75)',
    paddingVertical: 6,
    alignItems: 'center',
  },
  soldOutText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  body: {
    padding: spacing.m,
    gap: spacing.xs,
  },
  category: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  name: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  options: {
    fontSize: 13,
    color: colors.textMuted,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.s,
    paddingTop: spacing.s,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  price: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.primary,
  },
  fromLabel: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.textMuted,
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
