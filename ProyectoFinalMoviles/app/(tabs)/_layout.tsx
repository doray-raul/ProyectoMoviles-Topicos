import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { HeaderCartButton } from '@/components/CartButton';
import { ShrimpIcon } from '@/components/Logo';
import { useAuth } from '@/context/AuthContext';
import { colors } from '@/theme';

/** Header title: business icon + section name. */
function HeaderTitle({ text }: { text: string }) {
  return (
    <View style={styles.title}>
      <ShrimpIcon size={32} />
      <Text style={styles.titleText}>{text}</Text>
    </View>
  );
}

type IconName = keyof typeof Ionicons.glyphMap;

/** Tab icon: filled when selected, outlined when not. */
function icon(filled: IconName, outline: IconName) {
  return ({ color, size, focused }: { color: string; size: number; focused: boolean }) => (
    <Ionicons name={focused ? filled : outline} color={color} size={size} />
  );
}

/**
 * Main tabs. The "Carrito" (cart) button is in the header of all of them.
 * The "Panel" tab only exists for the admin (href: null hides it from customers).
 */
export default function TabsLayout() {
  const { isAdmin } = useAuth();

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.dark },
        headerTintColor: colors.white,
        headerRight: () => <HeaderCartButton />,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '700' },
        tabBarStyle: { backgroundColor: colors.white, borderTopColor: colors.border, height: 62, paddingBottom: 8 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Menú',
          headerTitle: () => <HeaderTitle text="El Camarón Crudo" />,
          tabBarIcon: icon('restaurant', 'restaurant-outline'),
        }}
      />
      <Tabs.Screen
        name="store"
        options={{
          title: 'Tienda',
          headerTitle: () => <HeaderTitle text="Tienda" />,
          tabBarIcon: icon('bag-handle', 'bag-handle-outline'),
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: 'Favoritos',
          headerTitle: () => <HeaderTitle text="Mis favoritos" />,
          tabBarIcon: icon('heart', 'heart-outline'),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Pedidos',
          headerTitle: () => <HeaderTitle text={isAdmin ? 'Pedidos' : 'Mis pedidos'} />,
          tabBarIcon: icon('receipt', 'receipt-outline'),
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Panel',
          href: isAdmin ? undefined : null,
          headerTitle: () => <HeaderTitle text="Panel del negocio" />,
          tabBarIcon: icon('stats-chart', 'stats-chart-outline'),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Ajustes',
          headerTitle: () => <HeaderTitle text="Ajustes" />,
          tabBarIcon: icon('settings', 'settings-outline'),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  title: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  titleText: {
    color: colors.white,
    fontSize: 18,
    fontWeight: '800',
  },
});
