import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Loading } from '@/components/States';
import { SettingsProvider } from '@/context/SettingsContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';
import { CartProvider } from '@/context/CartContext';
import { colors } from '@/theme';

/**
 * App root. Wraps everything with the contexts (session, settings, cart and toasts)
 * and defines which screens exist.
 */
export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <SettingsProvider>
          {/* The cart goes inside AuthProvider because it is emptied on logout */}
          <CartProvider>
            <ToastProvider>
              <StatusBar style="light" />
              <Navigation />
            </ToastProvider>
          </CartProvider>
        </SettingsProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

function Navigation() {
  const { token, loading } = useAuth();

  // While checking whether there was a saved session, no screen is shown
  if (loading) return <Loading text="Abriendo El Camarón Crudo..." />;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.dark },
        headerTintColor: colors.white,
        headerTitleStyle: { fontWeight: '700' },
        headerBackTitle: 'Regresar',
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      {/* Stack.Protected: if "guard" is false those screens do not exist and expo-router
          sends the user to the first allowed screen. This separates
          what someone without a session sees from what someone with a session sees. */}
      <Stack.Protected guard={!token}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ title: 'Crear cuenta' }} />
      </Stack.Protected>

      <Stack.Protected guard={!!token}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="dish/[id]" options={{ title: 'Detalle del platillo' }} />
        <Stack.Screen name="dish/form" options={{ title: 'Platillo' }} />
        <Stack.Screen name="product/[id]" options={{ title: 'Detalle del producto' }} />
        <Stack.Screen name="product/form" options={{ title: 'Producto' }} />
        <Stack.Screen name="cart" options={{ title: 'Mi carrito' }} />
        <Stack.Screen name="order/[id]" options={{ title: 'Pedido' }} />
      </Stack.Protected>
    </Stack>
  );
}
