import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ReactNode, useCallback, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getErrorMessage } from '@/api/client';
import { toggleFavorite, toggleDishAvailability, deleteDish, getDish } from '@/api/dishes';
import { Button } from '@/components/Button';
import { ConfirmModal } from '@/components/ConfirmModal';
import { Loading, ErrorMessage } from '@/components/States';
import { SpiceLevel } from '@/components/SpiceLevel';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useCart } from '@/context/CartContext';
import { colors, spacing, radius } from '@/theme';
import { Dish, Presentation } from '@/types';
import { formatDate, formatPrice } from '@/utils/format';

/** Row for an admin action: button + text explaining what it does. */
function AdminAction({ description, children }: { description: string; children: ReactNode }) {
  return (
    <View style={styles.action}>
      {children}
      <Text style={styles.actionText}>{description}</Text>
    </View>
  );
}

export default function DishDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isAdmin } = useAuth();
  const { showToast } = useToast();
  const { add } = useCart();

  const [dish, setDish] = useState<Dish | null>(null);
  const [error, setError] = useState('');
  const [visibleImage, setVisibleImage] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [processing, setProcessing] = useState(false);

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await getDish(Number(id));
      setDish(data);
      setVisibleImage(data.image ?? data.photos[0]?.image ?? null);
    } catch (e) {
      setError(getErrorMessage(e));
    }
  }, [id]);

  // Reload when coming back from the edit form
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function handleFavorite() {
    if (!dish) return;
    try {
      const { is_favorite } = await toggleFavorite(dish.id);
      setDish({ ...dish, is_favorite });
      showToast(is_favorite ? 'Se guardó en tus favoritos' : 'Se quitó de tus favoritos');
    } catch (e) {
      showToast(getErrorMessage(e), 'error');
    }
  }

  /** Adds a presentation (Orden, Tostada...) to the cart. */
  function addToCart(presentation: Presentation) {
    if (!dish) return;
    add({
      type: 'food',
      apiId: presentation.id,
      name: dish.name,
      detail: presentation.name,
      price: Number(presentation.price),
      image: dish.image,
      // If the recipe uses supplies, the API says how many servings the inventory can cover
      max: presentation.possible_servings ?? 20,
    });
    showToast(`Se agregó al carrito: ${dish.name} (${presentation.name})`);
  }

  async function handleToggleAvailability() {
    if (!dish) return;
    setProcessing(true);
    try {
      const { available } = await toggleDishAvailability(dish.id);
      showToast(available ? 'Ahora el platillo aparece como disponible' : 'El platillo quedó como no disponible');
      // Fetch it again because "available_now" also depends on the inventory
      await load();
    } catch (e) {
      showToast(getErrorMessage(e), 'error');
    } finally {
      setProcessing(false);
    }
  }

  async function handleDelete() {
    if (!dish) return;
    setProcessing(true);
    try {
      await deleteDish(dish.id);
      setConfirmDelete(false);
      showToast(`${dish.name} se eliminó del menú`);
      router.back();
    } catch (e) {
      // For example, if the dish already has orders the API does not allow deleting it
      setConfirmDelete(false);
      showToast(getErrorMessage(e), 'error');
    } finally {
      setProcessing(false);
    }
  }

  if (error) return <ErrorMessage message={error} onRetry={load} />;
  if (!dish) return <Loading text="Cargando platillo..." />;

  // The main image and the gallery photos are shown together as thumbnails
  const images = [dish.image, ...dish.photos.map((f) => f.image)].filter((url): url is string => !!url);

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Stack.Screen options={{ title: dish.name }} />

      {visibleImage ? (
        <Image source={{ uri: visibleImage }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={[styles.image, styles.noImage]}>
          <Ionicons name="image-outline" size={56} color={colors.textMuted} />
          <Text style={styles.textMuted}>Este platillo aún no tiene foto</Text>
        </View>
      )}

      {images.length > 1 && (
        <View style={styles.gallery}>
          <Text style={styles.galleryTitle}>Más fotos (toca una para verla en grande)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbnails}>
            {images.map((url) => (
              <Pressable key={url} onPress={() => setVisibleImage(url)}>
                <Image source={{ uri: url }} style={[styles.thumbnail, url === visibleImage && styles.thumbnailActive]} />
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.body}>
        <View style={styles.labels}>
          <Text style={styles.category}>{dish.category.name}</Text>
          {dish.featured && <Text style={[styles.badge, styles.featured]}>Destacado</Text>}
          <Text style={[styles.badge, dish.available_now ? styles.available : styles.unavailable]}>
            {dish.available_now ? 'Disponible' : 'No disponible'}
          </Text>
        </View>

        <Text style={styles.name}>{dish.name}</Text>

        <View style={styles.infoRow}>
          <SpiceLevel level={dish.spice} size={18} />
          {dish.average_rating !== null && (
            <View style={styles.rating}>
              <Ionicons name="star" size={16} color="#F2B01E" />
              <Text style={styles.ratingText}>
                {dish.average_rating} de 5 ({dish.reviews.length} reseñas)
              </Text>
            </View>
          )}
        </View>

        {dish.description ? <Text style={styles.description}>{dish.description}</Text> : null}

        <Button
          text={dish.is_favorite ? 'Quitar de mis favoritos' : 'Guardar en mis favoritos'}
          icon={dish.is_favorite ? 'heart-dislike-outline' : 'heart-outline'}
          variant={dish.is_favorite ? 'outline' : 'primary'}
          onPress={handleFavorite}
        />

        <Text style={styles.subtitle}>Precios y pedido</Text>
        <Text style={styles.textMuted}>Elige cómo lo quieres y presiona "Agregar al carrito".</Text>
        {dish.presentations.length === 0 ? (
          <Text style={styles.textMuted}>Todavía no tiene presentaciones con precio.</Text>
        ) : (
          <View style={styles.card}>
            {dish.presentations.map((p, i) => (
              <View key={p.id} style={[styles.presentation, i > 0 && styles.withBorder]}>
                <View style={styles.flex}>
                  <Text style={styles.presentationName}>{p.name}</Text>
                  <Text style={styles.price}>{formatPrice(p.price)}</Text>
                </View>
                {p.available_now && dish.available ? (
                  <Button
                    text="Agregar al carrito"
                    icon="cart-outline"
                    small
                    onPress={() => addToCart(p)}
                  />
                ) : (
                  <Text style={styles.soldOut}>Agotado por ahora</Text>
                )}
              </View>
            ))}
          </View>
        )}

        <Text style={styles.subtitle}>Lo que dicen los clientes</Text>
        {dish.reviews.length === 0 ? (
          <Text style={styles.textMuted}>Nadie ha reseñado este platillo todavía.</Text>
        ) : (
          dish.reviews.map((r) => (
            <View key={r.id} style={styles.card}>
              <View style={styles.reviewHeader}>
                <Text style={styles.reviewUser}>{r.user}</Text>
                <View style={styles.stars}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Ionicons key={n} name={n <= r.rating ? 'star' : 'star-outline'} size={14} color="#F2B01E" />
                  ))}
                </View>
              </View>
              {r.comment ? <Text style={styles.reviewText}>{r.comment}</Text> : null}
              <Text style={styles.reviewDate}>{formatDate(r.created)}</Text>
            </View>
          ))
        )}

        {isAdmin && (
          <View style={styles.admin}>
            <View style={styles.adminHeader}>
              <Ionicons name="shield-checkmark-outline" size={20} color={colors.textOnAccent} />
              <Text style={styles.adminTitle}>Opciones de administrador</Text>
            </View>

            <AdminAction description="Cambia el nombre, la descripción, la categoría, el picante o la foto.">
              <Button
                text="Editar platillo"
                icon="create-outline"
                variant="secondary"
                onPress={() => router.push({ pathname: '/dish/form', params: { id: dish.id } })}
              />
            </AdminAction>

            <AdminAction
              description={
                dish.available
                  ? 'Ocúltalo del menú de pedidos sin borrarlo (por ejemplo, si se acabó el producto).'
                  : 'Vuelve a mostrarlo como disponible para pedir.'
              }
            >
              <Button
                text={dish.available ? 'Marcar como no disponible' : 'Marcar como disponible'}
                icon={dish.available ? 'eye-off-outline' : 'eye-outline'}
                variant="outline"
                loading={processing && !confirmDelete}
                onPress={handleToggleAvailability}
              />
            </AdminAction>

            <AdminAction description="Lo borra del menú para siempre. Te pediremos confirmación antes.">
              <Button
                text="Eliminar platillo"
                icon="trash-outline"
                variant="danger"
                onPress={() => setConfirmDelete(true)}
              />
            </AdminAction>
          </View>
        )}
      </View>

      <ConfirmModal
        visible={confirmDelete}
        title="¿Eliminar este platillo?"
        message={`"${dish.name}" se borrará del menú y no se podrá recuperar.`}
        confirmText="Sí, eliminar"
        icon="trash-outline"
        loading={processing}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    paddingBottom: spacing.xl * 2,
  },
  image: {
    width: '100%',
    aspectRatio: 16 / 10,
    backgroundColor: '#EFEAE3',
  },
  noImage: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.s,
  },
  gallery: {
    paddingHorizontal: spacing.l,
    paddingTop: spacing.m,
    gap: spacing.s,
  },
  galleryTitle: {
    fontSize: 12,
    color: colors.textMuted,
  },
  thumbnails: {
    gap: spacing.s,
  },
  thumbnail: {
    width: 76,
    height: 58,
    borderRadius: radius.s,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  thumbnailActive: {
    borderColor: colors.primary,
  },
  body: {
    padding: spacing.l,
    gap: spacing.m,
  },
  labels: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.s,
  },
  category: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  badge: {
    fontSize: 12,
    fontWeight: '700',
    paddingHorizontal: spacing.s,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: 'hidden',
  },
  featured: {
    color: colors.textOnAccent,
    backgroundColor: colors.accent,
  },
  available: {
    color: colors.success,
    backgroundColor: colors.successSoft,
  },
  unavailable: {
    color: colors.error,
    backgroundColor: colors.errorSoft,
  },
  name: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
  },
  infoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.l,
  },
  rating: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  ratingText: {
    fontSize: 14,
    color: colors.text,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginTop: spacing.m,
  },
  textMuted: {
    fontSize: 14,
    color: colors.textMuted,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.m,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.m,
    gap: spacing.xs,
  },
  flex: {
    flex: 1,
  },
  presentation: {
    flexDirection: 'row',
    gap: spacing.m,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.s,
  },
  withBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  presentationName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  soldOut: {
    fontSize: 12,
    color: colors.error,
  },
  price: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.primary,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewUser: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  stars: {
    flexDirection: 'row',
  },
  reviewText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
  reviewDate: {
    fontSize: 12,
    color: colors.textMuted,
  },
  admin: {
    marginTop: spacing.l,
    padding: spacing.l,
    gap: spacing.l,
    borderRadius: radius.l,
    borderWidth: 1.5,
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  adminHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
  },
  adminTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textOnAccent,
  },
  action: {
    gap: 6,
  },
  actionText: {
    fontSize: 12,
    color: colors.textOnAccent,
    lineHeight: 17,
  },
});
