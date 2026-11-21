import { Ionicons } from '@expo/vector-icons';
import { ReactNode, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { Button } from '@/components/Button';
import { Chip } from '@/components/Chip';
import { ConfirmModal } from '@/components/ConfirmModal';
import { API_URL } from '@/config';
import { SORT_OPTIONS, PAGE_SIZE_OPTIONS, useSettings } from '@/context/SettingsContext';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { colors, spacing, radius } from '@/theme';

interface SectionProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
  children: ReactNode;
}

/** Block with an icon, a title and a line explaining what it is for. */
function Section({ icon, title, description, children }: SectionProps) {
  return (
    <View style={styles.card}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionIcon}>
          <Ionicons name={icon} size={18} color={colors.secondary} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.sectionTitle}>{title}</Text>
          {description ? <Text style={styles.help}>{description}</Text> : null}
        </View>
      </View>
      {children}
    </View>
  );
}

export default function SettingsScreen() {
  const { user, isAdmin, signOut } = useAuth();
  const { settings, updateSetting } = useSettings();
  const { showToast } = useToast();
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  /** Saves the setting and tells the user it was saved. */
  function save<K extends keyof typeof settings>(key: K, value: (typeof settings)[K]) {
    updateSetting(key, value);
    showToast('Preferencia guardada');
  }

  async function handleLogout() {
    setLoggingOut(true);
    await signOut();
    // Once there is no token, the layout sends the user to the login screen automatically
  }

  const initial = (user?.username ?? '?').charAt(0).toUpperCase();

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      {/* Profile card */}
      <View style={styles.profile}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <View style={styles.flex}>
          <Text style={styles.profileName}>{user?.username}</Text>
          <Text style={styles.profileEmail}>{user?.email || 'Sin correo registrado'}</Text>
        </View>
        <View style={[styles.role, isAdmin && styles.roleAdmin]}>
          <Text style={[styles.roleText, isAdmin && styles.roleTextAdmin]}>
            {isAdmin ? 'Administrador' : 'Cliente'}
          </Text>
        </View>
      </View>

      {isAdmin && (
        <View style={styles.adminNote}>
          <Ionicons name="shield-checkmark-outline" size={18} color={colors.textOnAccent} />
          <Text style={styles.adminNoteText}>
            Como administrador puedes agregar platillos y productos desde el Menú y la Tienda, avanzar los
            pedidos desde su detalle y ver ventas e inventario en la pestaña Panel.
          </Text>
        </View>
      )}

      <Section
        icon="list-outline"
        title="Platillos por página"
        description="Cuántos platillos se muestran antes de pasar a la siguiente página."
      >
        <View style={styles.options}>
          {PAGE_SIZE_OPTIONS.map((n) => (
            <Chip
              key={n}
              text={`${n} platillos`}
              active={settings.pageSize === n}
              onPress={() => save('pageSize', n)}
            />
          ))}
        </View>
      </Section>

      <Section
        icon="swap-vertical-outline"
        title="Orden del menú"
        description="Cómo se acomodan los platillos cada vez que abres el menú."
      >
        <View style={styles.options}>
          {SORT_OPTIONS.map((o) => (
            <Chip
              key={o.value}
              text={o.text}
              active={settings.defaultOrdering === o.value}
              onPress={() => save('defaultOrdering', o.value)}
            />
          ))}
        </View>
      </Section>

      <Section icon="eye-outline" title="Platillos no disponibles">
        <View style={styles.row}>
          <Text style={[styles.flex, styles.help]}>
            {settings.showUnavailable
              ? 'Se muestran todos los platillos, aunque hoy no se puedan pedir.'
              : 'Solo se muestran los platillos que se pueden pedir.'}
          </Text>
          <Switch
            value={settings.showUnavailable}
            onValueChange={(value) => save('showUnavailable', value)}
            trackColor={{ true: colors.secondary, false: colors.border }}
            thumbColor={colors.white}
          />
        </View>
      </Section>

      <Section icon="server-outline" title="Servidor" description="Dirección de la API a la que se conecta la app.">
        <Text style={styles.value} numberOfLines={1}>
          {API_URL}
        </Text>
      </Section>

      <Button
        text="Cerrar sesión"
        variant="danger"
        icon="log-out-outline"
        onPress={() => setConfirmLogout(true)}
      />

      <ConfirmModal
        visible={confirmLogout}
        title="¿Cerrar sesión?"
        message="Tendrás que escribir tu usuario y contraseña otra vez para entrar."
        confirmText="Sí, cerrar sesión"
        icon="log-out-outline"
        loading={loggingOut}
        onConfirm={handleLogout}
        onCancel={() => setConfirmLogout(false)}
      />
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
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    padding: spacing.l,
    borderRadius: radius.l,
    backgroundColor: colors.dark,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.white,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.white,
  },
  profileEmail: {
    fontSize: 13,
    color: '#B5B8BE',
  },
  role: {
    paddingHorizontal: spacing.m,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: colors.darkLight,
  },
  roleAdmin: {
    backgroundColor: colors.accent,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.white,
  },
  roleTextAdmin: {
    color: colors.textOnAccent,
  },
  adminNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    padding: spacing.m,
    borderRadius: radius.m,
    backgroundColor: colors.accentSoft,
  },
  adminNoteText: {
    flex: 1,
    fontSize: 13,
    color: colors.textOnAccent,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radius.l,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.l,
    gap: spacing.m,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.m,
  },
  sectionIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.secondarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  help: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.s,
  },
  value: {
    fontSize: 14,
    color: colors.textMuted,
  },
});
