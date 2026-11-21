import { Ionicons } from '@expo/vector-icons';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { SpiceLevel } from './SpiceLevel';
import { colors, spacing, radius } from '@/theme';
import { Dish } from '@/types';
import { formatPrice } from '@/utils/format';

interface Props {
  dish: Dish;
  onPress: () => void;
  onFavorite: () => void;
}

/**
 * Catalog card. It has two actions and both say what they do:
 * - "Guardar / Guardado" button for favorites.
 * - "Ver detalle" (it also opens by tapping the photo or the name).
 *
 * Note: the whole card is NOT a Pressable. In the browser every Pressable becomes a <button>
 * and HTML does not allow a button inside another, so the top part and the two bottom buttons
 * are separate Pressables, next to each other.
 */
export function DishCard({ dish, onPress, onFavorite }: Props) {
  return (
    <View style={styles.card}>
      {/* Top part: photo and information. Tapping it opens the detail */}
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Ver detalle de ${dish.name}`}
        style={({ pressed }) => pressed && styles.pressed}
      >
        <View>
          {dish.image ? (
            <Image source={{ uri: dish.image }} style={styles.image} resizeMode="cover" />
          ) : (
            <View style={[styles.image, styles.noImage]}>
              <Ionicons name="image-outline" size={34} color={colors.textMuted} />
              <Text style={styles.noImageText}>Sin foto</Text>
            </View>
          )}

          {dish.featured && (
            <View style={styles.featured}>
              <Ionicons name="star" size={12} color={colors.textOnAccent} />
              <Text style={styles.featuredText}>Destacado</Text>
            </View>
          )}

          {!dish.available_now && (
            <View style={styles.soldOut}>
              <Text style={styles.soldOutText}>No disponible por ahora</Text>
            </View>
          )}
        </View>

        <View style={styles.body}>
          <Text style={styles.category}>{dish.category.name}</Text>
          <Text style={styles.name} numberOfLines={2}>
            {dish.name}
          </Text>

          <View style={styles.infoRow}>
            <Text style={styles.price}>
              {dish.price_from !== null && <Text style={styles.fromLabel}>desde </Text>}
              {formatPrice(dish.price_from)}
            </Text>
            <SpiceLevel level={dish.spice} />
          </View>
        </View>
      </Pressable>

      {/* Bottom part: the two buttons, each one independent */}
      <View style={styles.actions}>
        <Pressable
          onPress={onFavorite}
          hitSlop={6}
          accessibilityRole="button"
          style={[styles.favorite, dish.is_favorite && styles.favoriteActive]}
        >
          <Ionicons
            name={dish.is_favorite ? 'heart' : 'heart-outline'}
            size={16}
            color={dish.is_favorite ? colors.white : colors.primary}
          />
          <Text style={[styles.favoriteText, dish.is_favorite && styles.favoriteTextActive]}>
            {dish.is_favorite ? 'Guardado' : 'Guardar'}
          </Text>
        </Pressable>

        <Pressable onPress={onPress} hitSlop={6} accessibilityRole="button" style={styles.viewDetail}>
          <Text style={styles.viewDetailText}>Ver detalle</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.secondary} />
        </Pressable>
      </View>
    </View>
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
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: spacing.m,
    paddingVertical: spacing.s,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  favorite: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.m,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  favoriteActive: {
    backgroundColor: colors.primary,
  },
  favoriteText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  favoriteTextActive: {
    color: colors.white,
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
