import { Ionicons } from '@expo/vector-icons';
import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, radius } from '@/theme';

type ToastType = 'success' | 'error';

interface Toast {
  text: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (text: string, type?: ToastType) => void;
}

const Context = createContext<ToastContextValue | null>(null);

const DURATION_MS = 2800;

/**
 * Shows a short message at the bottom of the screen ("Platillo creado", "Agregado a favoritos"...)
 * so the user knows their action really happened. It disappears by itself after a few seconds.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((text: string, type: ToastType = 'success') => {
    // If there was already a toast, it is replaced and the timer restarts
    if (timer.current) clearTimeout(timer.current);
    setToast({ text, type });
    timer.current = setTimeout(() => setToast(null), DURATION_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return (
    <Context.Provider value={{ showToast }}>
      {children}
      {toast && (
        <View style={styles.container} pointerEvents="none">
          <View style={[styles.toast, toast.type === 'error' && styles.toastError]}>
            <Ionicons
              name={toast.type === 'success' ? 'checkmark-circle' : 'alert-circle'}
              size={20}
              color={toast.type === 'success' ? colors.accent : colors.white}
            />
            <Text style={styles.text}>{toast.text}</Text>
          </View>
        </View>
      )}
    </Context.Provider>
  );
}

export function useToast() {
  const context = useContext(Context);
  if (!context) throw new Error('useAviso debe usarse dentro de <AvisoProvider>');
  return context;
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 90,
    alignItems: 'center',
    paddingHorizontal: spacing.l,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    maxWidth: 480,
    paddingVertical: spacing.m,
    paddingHorizontal: spacing.l,
    borderRadius: radius.m,
    backgroundColor: colors.dark,
  },
  toastError: {
    backgroundColor: colors.error,
  },
  text: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
});
