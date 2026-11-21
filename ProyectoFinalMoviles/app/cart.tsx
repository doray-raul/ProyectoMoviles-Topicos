import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { getErrorMessage } from '@/api/client';
import { createOrder } from '@/api/orders';
import { Button } from '@/components/Button';
import { TextField } from '@/components/TextField';
import { Counter } from '@/components/Counter';
import { ErrorBanner, EmptyState } from '@/components/States';
import { useToast } from '@/context/ToastContext';
import { useCart } from '@/context/CartContext';
import { colors, spacing, radius } from '@/theme';
import { formatPrice } from '@/utils/format';

/** Cart: review what is going to be ordered, change quantities and send the order to the API. */
export default function CartScreen() {
  const { items, totalPieces, totalPrice, updateQuantity, remove, clear, toApiLines } = useCart();
  const { showToast } = useToast();
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function placeOrder() {
    setError('');
    setSubmitting(true);
    try {
      const order = await createOrder(toApiLines(), note);
      clear();
      showToast(`Tu pedido #${order.id} se recibió`);
      // replace: going back from the order does not return to an empty cart
      router.replace(`/order/${order.id}`);
    } catch (e) {
      // For example: "Solo quedan 2 de Gorra - Negra" or "Stock insuficiente de camarón"
      setError(getErrorMessage(e));
      setSubmitting(false);
    }
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon="cart-outline"
        title="Tu carrito está vacío"
        text='Entra al Menú o a la Tienda y presiona "Agregar al carrito" en lo que se te antoje.'
        buttonText="Ver el menú"
        onButtonPress={() => router.navigate('/')}
      />
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
      <View>
        <Text style={styles.title}>Revisa tu pedido</Text>
        <Text style={styles.help}>Ajusta las cantidades y presiona "Hacer pedido" para enviarlo al negocio.</Text>
      </View>

      {error ? <ErrorBanner message={error} /> : null}

      <View style={styles.card}>
        {items.map((item, i) => (
          <View key={item.key} style={[styles.line, i > 0 && styles.withBorder]}>
            {item.image ? (
              <Image source={{ uri: item.image }} style={styles.thumbnail} />
            ) : (
              <View style={[styles.thumbnail, styles.noImage]}>
                <Ionicons name={item.type === 'food' ? 'restaurant-outline' : 'shirt-outline'} size={22} color={colors.textMuted} />
              </View>
            )}

            <View style={styles.flex}>
              <Text style={styles.type}>{item.type === 'food' ? 'Menú' : 'Tienda'}</Text>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.detail}>
                {item.detail} · {formatPrice(item.price)} c/u
              </Text>
              <View style={styles.actionsRow}>
                <Counter value={item.quantity} max={item.max} onChange={(n) => updateQuantity(item.key, n)} />
                <Pressable onPress={() => remove(item.key)} hitSlop={6} style={styles.remove}>
                  <Ionicons name="trash-outline" size={16} color={colors.error} />
                  <Text style={styles.removeText}>Quitar</Text>
                </Pressable>
              </View>
            </View>

            <Text style={styles.subtotal}>{formatPrice(item.price * item.quantity)}</Text>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <TextField
          label="Nota para el negocio (opcional)"
          placeholder="Ejemplo: sin cebolla, bien picoso, paso a las 3"
          value={note}
          onChangeText={setNote}
          maxLength={200}
        />
      </View>

      <View style={styles.summary}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryText}>Piezas</Text>
          <Text style={styles.summaryText}>{totalPieces}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.totalText}>Total a pagar</Text>
          <Text style={styles.totalPrice}>{formatPrice(totalPrice)}</Text>
        </View>
        <Text style={styles.summaryNote}>Pagas al recoger tu pedido en el local.</Text>
      </View>

      <Button text="Hacer pedido" icon="checkmark-circle-outline" onPress={placeOrder} loading={submitting} />
      <View style={styles.buttons}>
        <View style={styles.flex}>
          <Button text="Seguir comprando" variant="outline" small onPress={() => router.back()} />
        </View>
        <View style={styles.flex}>
          <Button text="Vaciar carrito" variant="danger" small onPress={clear} disabled={submitting} />
        </View>
      </View>
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
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
  },
  help: {
    fontSize: 14,
    color: colors.textMuted,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.l,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.l,
  },
  line: {
    flexDirection: 'row',
    gap: spacing.m,
    paddingVertical: spacing.m,
  },
  withBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  thumbnail: {
    width: 64,
    height: 64,
    borderRadius: radius.m,
    backgroundColor: '#EFEAE3',
  },
  noImage: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  type: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.secondary,
    textTransform: 'uppercase',
  },
  name: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  detail: {
    fontSize: 13,
    color: colors.textMuted,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    marginTop: spacing.s,
  },
  remove: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  removeText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.error,
  },
  subtotal: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  summary: {
    padding: spacing.l,
    gap: spacing.s,
    borderRadius: radius.l,
    backgroundColor: colors.dark,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryText: {
    fontSize: 14,
    color: '#B5B8BE',
  },
  totalText: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.white,
  },
  totalPrice: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.accent,
  },
  summaryNote: {
    fontSize: 12,
    color: '#B5B8BE',
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing.m,
  },
});
