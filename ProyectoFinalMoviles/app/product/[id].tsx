import { Ionicons } from '@expo/vector-icons';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ApiError, getErrorMessage } from '@/api/client';
import {
  adjustStock,
  toggleProductAvailability,
  createVariant,
  VariantInput,
  deleteProduct,
  deleteVariant,
  getProduct,
} from '@/api/store';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { Chip } from '@/components/Chip';
import { ConfirmModal } from '@/components/ConfirmModal';
import { Counter } from '@/components/Counter';
import { Loading, ErrorMessage } from '@/components/States';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { useCart } from '@/context/CartContext';
import { colors, spacing, radius } from '@/theme';
import { Product, Variant } from '@/types';
import { formatPrice } from '@/utils/format';

const EMPTY_VARIANT: VariantInput = { name: '', sku: '', price: '', stock: '' };

// What will be deleted when the confirmation opens
type PendingDelete = { type: 'product' } | { type: 'variant'; variant: Variant } | null;

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isAdmin } = useAuth();
  const { showToast } = useToast();
  const { add } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState('');
  const [visibleImage, setVisibleImage] = useState<string | null>(null);
  const [variantId, setVariantId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);

  // State of the admin actions
  const [pendingDelete, setPendingDelete] = useState<PendingDelete>(null);
  const [processing, setProcessing] = useState(false);
  const [newVariant, setNewVariant] = useState<VariantInput>(EMPTY_VARIANT);
  const [variantErrors, setVariantErrors] = useState<Partial<Record<keyof VariantInput, string>>>({});

  const load = useCallback(async () => {
    setError('');
    try {
      const data = await getProduct(Number(id));
      setProduct(data);
      setVisibleImage(data.image ?? data.photos[0]?.image ?? null);
      // Preselect the first size that has stock (if the previous one is no longer valid)
      setVariantId((current) => {
        if (current && data.variants.some((v) => v.id === current)) return current;
        return data.variants.find((v) => v.stock > 0)?.id ?? null;
      });
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
  if (!product) return <Loading text="Cargando producto..." />;

  const variant = product.variants.find((v) => v.id === variantId) ?? null;
  const max = variant ? Math.min(variant.stock, 20) : 1;
  const images = [product.image, ...product.photos.map((f) => f.image)].filter((url): url is string => !!url);

  function selectVariant(v: Variant) {
    if (v.stock === 0) return; // sold-out ones are shown but cannot be selected
    setVariantId(v.id);
    setQuantity(1);
  }

  function addToCart() {
    if (!product || !variant) return;
    add(
      {
        type: 'merch',
        apiId: variant.id,
        name: product.name,
        detail: variant.name,
        price: Number(variant.price),
        image: product.image,
        max: variant.stock,
      },
      quantity,
    );
    showToast(`Se agregó al carrito: ${quantity} x ${product.name} (${variant.name})`);
    setQuantity(1);
  }

  // ---------- Admin actions ----------

  async function handleToggleAvailability() {
    if (!product) return;
    setProcessing(true);
    try {
      const { available } = await toggleProductAvailability(product.id);
      showToast(available ? 'El producto ya se puede comprar' : 'El producto quedó como no disponible');
      await load();
    } catch (e) {
      showToast(getErrorMessage(e), 'error');
    } finally {
      setProcessing(false);
    }
  }

  /** Adds or removes pieces with the adjust_stock custom action. */
  async function moveStock(v: Variant, movedQuantity: number) {
    try {
      const { stock } = await adjustStock(v.id, movedQuantity);
      showToast(`${v.name}: ahora hay ${stock} pieza(s)`);
      await load();
    } catch (e) {
      showToast(getErrorMessage(e), 'error');
    }
  }

  async function addVariant() {
    if (!product) return;
    const errors: typeof variantErrors = {};
    if (!newVariant.name.trim()) errors.name = 'Escribe la talla o el color.';
    if (!newVariant.sku.trim()) errors.sku = 'Escribe un código.';
    if (!(Number(newVariant.price) > 0)) errors.price = 'Precio mayor a 0.';
    setVariantErrors(errors);
    if (Object.keys(errors).length > 0) return;

    try {
      await createVariant(product.id, newVariant);
      showToast(`Se agregó la opción "${newVariant.name}"`);
      setNewVariant(EMPTY_VARIANT);
      await load();
    } catch (e) {
      // For example, a repeated SKU: Django returns it as an error on the "sku" field
      if (e instanceof ApiError) {
        setVariantErrors({
          name: e.fields.name?.[0],
          sku: e.fields.sku?.[0],
          price: e.fields.price?.[0],
          stock: e.fields.stock?.[0],
        });
      }
      showToast(getErrorMessage(e), 'error');
    }
  }

  async function confirmDelete() {
    if (!product || !pendingDelete) return;
    setProcessing(true);
    try {
      if (pendingDelete.type === 'product') {
        await deleteProduct(product.id);
        showToast(`${product.name} se eliminó de la tienda`);
        setPendingDelete(null);
        router.back();
        return;
      }
      await deleteVariant(pendingDelete.variant.id);
      showToast(`Se eliminó la opción "${pendingDelete.variant.name}"`);
      setPendingDelete(null);
      await load();
    } catch (e) {
      setPendingDelete(null);
      showToast(getErrorMessage(e), 'error');
    } finally {
      setProcessing(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: product.name }} />

      {visibleImage ? (
        <Image source={{ uri: visibleImage }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={[styles.image, styles.noImage]}>
          <Ionicons name="shirt-outline" size={56} color={colors.textMuted} />
          <Text style={styles.textMuted}>Este producto aún no tiene foto</Text>
        </View>
      )}

      {images.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbnails}>
          {images.map((url) => (
            <Pressable key={url} onPress={() => setVisibleImage(url)}>
              <Image source={{ uri: url }} style={[styles.thumbnail, url === visibleImage && styles.thumbnailActive]} />
            </Pressable>
          ))}
        </ScrollView>
      )}

      <View style={styles.body}>
        <View style={styles.labels}>
          <Text style={styles.category}>{product.category.name}</Text>
          {product.featured && <Text style={[styles.badge, styles.featured]}>Destacado</Text>}
          {!product.available && <Text style={[styles.badge, styles.unavailable]}>No disponible</Text>}
        </View>

        <Text style={styles.name}>{product.name}</Text>
        {product.description ? <Text style={styles.description}>{product.description}</Text> : null}

        {/* ---------- Purchase ---------- */}
        <View style={styles.card}>
          <Text style={styles.subtitle}>1. Elige una opción</Text>
          {product.variants.length === 0 ? (
            <Text style={styles.textMuted}>Este producto todavía no tiene tallas ni colores.</Text>
          ) : (
            <View style={styles.options}>
              {product.variants.map((v) => (
                <Chip
                  key={v.id}
                  text={v.stock > 0 ? `${v.name} - ${formatPrice(v.price)}` : `${v.name} (agotada)`}
                  active={v.id === variantId}
                  onPress={() => selectVariant(v)}
                />
              ))}
            </View>
          )}

          {variant && (
            <>
              <Text style={styles.subtitle}>2. ¿Cuántas piezas?</Text>
              <View style={styles.buyRow}>
                <Counter value={quantity} max={max} onChange={setQuantity} />
                <Text style={[styles.stockText, variant.stock <= 3 && styles.stockLow]}>
                  {variant.stock <= 3 ? `Solo quedan ${variant.stock}` : `${variant.stock} disponibles`}
                </Text>
              </View>

              <View style={styles.total}>
                <Text style={styles.totalText}>Total</Text>
                <Text style={styles.totalPrice}>{formatPrice(Number(variant.price) * quantity)}</Text>
              </View>
            </>
          )}

          <Button
            text={variant ? 'Agregar al carrito' : 'Elige una opción disponible'}
            icon="cart-outline"
            disabled={!variant || !product.available}
            onPress={addToCart}
          />
        </View>

        {/* ---------- Administration ---------- */}
        {isAdmin && (
          <View style={styles.admin}>
            <View style={styles.adminHeader}>
              <Ionicons name="shield-checkmark-outline" size={20} color={colors.textOnAccent} />
              <Text style={styles.adminTitle}>Opciones de administrador</Text>
            </View>

            <View style={styles.adminButtons}>
              <Button
                text="Editar producto"
                icon="create-outline"
                variant="secondary"
                small
                onPress={() => router.push({ pathname: '/product/form', params: { id: product.id } })}
              />
              <Button
                text={product.available ? 'Marcar como no disponible' : 'Marcar como disponible'}
                icon={product.available ? 'eye-off-outline' : 'eye-outline'}
                variant="outline"
                small
                loading={processing && !pendingDelete}
                onPress={handleToggleAvailability}
              />
              <Button
                text="Eliminar producto"
                icon="trash-outline"
                variant="danger"
                small
                onPress={() => setPendingDelete({ type: 'product' })}
              />
            </View>

            <Text style={styles.adminSubtitle}>Inventario por talla / color</Text>
            <Text style={styles.adminHelp}>
              Usa "Sumar 5" cuando llegue mercancía y "Restar 1" si se vendió en el local o se dañó.
            </Text>
            {product.variants.map((v) => (
              <View key={v.id} style={styles.inventory}>
                <View style={styles.flex}>
                  <Text style={styles.inventoryName}>
                    {v.name} <Text style={styles.sku}>({v.sku})</Text>
                  </Text>
                  <Text style={[styles.inventoryStock, v.stock <= 3 && styles.stockLow]}>
                    {formatPrice(v.price)} · {v.stock} en stock
                  </Text>
                </View>
                <Button text="Restar 1" variant="outline" small disabled={v.stock === 0} onPress={() => moveStock(v, -1)} />
                <Button text="Sumar 5" variant="secondary" small onPress={() => moveStock(v, 5)} />
                <Pressable
                  onPress={() => setPendingDelete({ type: 'variant', variant: v })}
                  hitSlop={8}
                  accessibilityLabel={`Eliminar ${v.name}`}
                >
                  <Ionicons name="trash-outline" size={20} color={colors.error} />
                </Pressable>
              </View>
            ))}

            <Text style={styles.adminSubtitle}>Agregar talla o color</Text>
            <View style={styles.fieldsRow}>
              <View style={styles.flex}>
                <TextField
                  label="Nombre"
                  placeholder="M, XL, Negra..."
                  value={newVariant.name}
                  onChangeText={(t) => setNewVariant({ ...newVariant, name: t })}
                  error={variantErrors.name}
                />
              </View>
              <View style={styles.flex}>
                <TextField
                  label="Código (SKU)"
                  placeholder="GOR-NEG"
                  autoCapitalize="characters"
                  value={newVariant.sku}
                  onChangeText={(t) => setNewVariant({ ...newVariant, sku: t })}
                  error={variantErrors.sku}
                />
              </View>
            </View>
            <View style={styles.fieldsRow}>
              <View style={styles.flex}>
                <TextField
                  label="Precio"
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  value={newVariant.price}
                  onChangeText={(t) => setNewVariant({ ...newVariant, price: t })}
                  error={variantErrors.price}
                />
              </View>
              <View style={styles.flex}>
                <TextField
                  label="Piezas iniciales"
                  placeholder="0"
                  keyboardType="number-pad"
                  value={newVariant.stock}
                  onChangeText={(t) => setNewVariant({ ...newVariant, stock: t })}
                  error={variantErrors.stock}
                />
              </View>
            </View>
            <Button text="Agregar opción" icon="add" variant="secondary" onPress={addVariant} />
          </View>
        )}
      </View>

      <ConfirmModal
        visible={pendingDelete !== null}
        title={pendingDelete?.type === 'variant' ? '¿Eliminar esta opción?' : '¿Eliminar este producto?'}
        message={
          pendingDelete?.type === 'variant'
            ? `La opción "${pendingDelete.variant.name}" se borrará del producto.`
            : `"${product.name}" se borrará de la tienda y no se podrá recuperar.`
        }
        confirmText="Sí, eliminar"
        icon="trash-outline"
        loading={processing}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
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
  flex: {
    flex: 1,
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
  thumbnails: {
    gap: spacing.s,
    paddingHorizontal: spacing.l,
    paddingTop: spacing.m,
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
  unavailable: {
    color: colors.error,
    backgroundColor: colors.errorSoft,
  },
  name: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
  },
  textMuted: {
    fontSize: 14,
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
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s,
  },
  buyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
  },
  stockText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  stockLow: {
    color: colors.error,
    fontWeight: '700',
  },
  total: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.s,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  totalText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  totalPrice: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primary,
  },
  admin: {
    marginTop: spacing.m,
    padding: spacing.l,
    gap: spacing.m,
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
  adminButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s,
  },
  adminSubtitle: {
    marginTop: spacing.s,
    fontSize: 15,
    fontWeight: '800',
    color: colors.textOnAccent,
  },
  adminHelp: {
    fontSize: 12,
    color: colors.textOnAccent,
  },
  inventory: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    padding: spacing.m,
    borderRadius: radius.m,
    backgroundColor: colors.white,
  },
  inventoryName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  sku: {
    fontSize: 12,
    fontWeight: '400',
    color: colors.textMuted,
  },
  inventoryStock: {
    fontSize: 13,
    color: colors.textMuted,
  },
  fieldsRow: {
    flexDirection: 'row',
    gap: spacing.m,
  },
});
