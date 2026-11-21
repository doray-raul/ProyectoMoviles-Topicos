import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { useAuth } from './AuthContext';
import { NewOrderLine } from '@/api/orders';

const CART_KEY = 'cart';
const MAX_PER_LINE = 20; // the API does not accept more than 20 pieces per line

/** What the user collects before placing the order. It only lives on the device. */
export interface CartItem {
  key: string; // "food-5" or "merch-12": identifies the line without repeating it
  type: 'food' | 'merch';
  apiId: number; // id of the presentation (food) or of the variant (merch)
  name: string; // "Tostada de camarón"
  detail: string; // "Orden" or "Talla M"
  price: number;
  quantity: number;
  image: string | null;
  max: number; // maximum number of pieces (for merch it is the available stock)
}

type NewCartItem = Omit<CartItem, 'key' | 'quantity'>;

interface CartContextValue {
  items: CartItem[];
  totalPieces: number;
  totalPrice: number;
  add: (item: NewCartItem, quantity?: number) => void;
  updateQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  toApiLines: () => NewOrderLine[];
}

const Context = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Restores the saved cart when the app opens
  useEffect(() => {
    AsyncStorage.getItem(CART_KEY).then((saved) => {
      if (saved) setItems(JSON.parse(saved));
      setLoaded(true);
    });
  }, []);

  // It is emptied on logout, so the next user does not see the previous user's cart
  useEffect(() => {
    if (!token) setItems([]);
  }, [token]);

  // Every change is saved on the device (only after reading what was saved,
  // otherwise the empty cart at startup would erase what was already there)
  useEffect(() => {
    if (loaded) AsyncStorage.setItem(CART_KEY, JSON.stringify(items));
  }, [items, loaded]);

  const add = useCallback((newItem: NewCartItem, quantity = 1) => {
    const key = `${newItem.type}-${newItem.apiId}`;
    const cap = Math.min(newItem.max, MAX_PER_LINE);
    setItems((currentItems) => {
      const existing = currentItems.find((i) => i.key === key);
      // If it was already in the cart, only the quantity is added, without going over the cap
      if (existing) {
        return currentItems.map((i) =>
          i.key === key ? { ...i, quantity: Math.min(i.quantity + quantity, cap) } : i,
        );
      }
      return [...currentItems, { ...newItem, key, max: cap, quantity: Math.min(quantity, cap) }];
    });
  }, []);

  const updateQuantity = useCallback((key: string, quantity: number) => {
    setItems((currentItems) =>
      currentItems
        .map((i) => (i.key === key ? { ...i, quantity: Math.min(quantity, i.max) } : i))
        .filter((i) => i.quantity > 0), // si llega a 0 se quita del carrito
    );
  }, []);

  const remove = useCallback((key: string) => {
    setItems((currentItems) => currentItems.filter((i) => i.key !== key));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  /** Converts the cart to the format expected by POST /api/orders/ */
  const toApiLines = useCallback(
    (): NewOrderLine[] =>
      items.map((i) =>
        i.type === 'food'
          ? { presentation: i.apiId, quantity: i.quantity }
          : { product_variant: i.apiId, quantity: i.quantity },
      ),
    [items],
  );

  // useMemo: totals are only recalculated when the items change
  const { totalPieces, totalPrice } = useMemo(
    () => ({
      totalPieces: items.reduce((sum, i) => sum + i.quantity, 0),
      totalPrice: items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    }),
    [items],
  );

  return (
    <Context.Provider
      value={{ items, totalPieces, totalPrice, add, updateQuantity, remove, clear, toApiLines }}
    >
      {children}
    </Context.Provider>
  );
}

export function useCart() {
  const context = useContext(Context);
  if (!context) throw new Error('useCarrito debe usarse dentro de <CarritoProvider>');
  return context;
}
