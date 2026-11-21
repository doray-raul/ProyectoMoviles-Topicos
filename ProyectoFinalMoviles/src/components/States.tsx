import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Button } from './Button';
import { colors, spacing, radius } from '@/theme';

// Components for the three states any screen that fetches data has:
// loading, error and "nothing to show".

export function Loading({ text = 'Cargando...' }: { text?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

export function ErrorMessage({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.center}>
      <View style={[styles.circle, { backgroundColor: colors.errorSoft }]}>
        <Ionicons name="cloud-offline-outline" size={36} color={colors.error} />
      </View>
      <Text style={styles.title}>Algo salió mal</Text>
      <Text style={styles.text}>{message}</Text>
      {onRetry && <Button text="Intentar de nuevo" variant="outline" icon="refresh" onPress={onRetry} />}
    </View>
  );
}

interface EmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  text?: string;
  buttonText?: string;
  onButtonPress?: () => void;
}

/** Empty screen with an explanation and, optionally, a button that says what to do. */
export function EmptyState({ icon, title, text, buttonText, onButtonPress }: EmptyStateProps) {
  return (
    <View style={styles.center}>
      <View style={[styles.circle, { backgroundColor: colors.primarySoft }]}>
        <Ionicons name={icon} size={36} color={colors.primary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {text ? <Text style={styles.text}>{text}</Text> : null}
      {buttonText && onButtonPress ? <Button text={buttonText} variant="secondary" onPress={onButtonPress} /> : null}
    </View>
  );
}

/** Red banner for errors inside a form or a screen that did load. */
export function ErrorBanner({ message }: { message: string }) {
  return (
    <View style={styles.banner}>
      <Ionicons name="alert-circle" size={20} color={colors.error} />
      <Text style={styles.bannerText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.m,
  },
  circle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  text: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 360,
    lineHeight: 20,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    padding: spacing.m,
    borderRadius: radius.m,
    backgroundColor: colors.errorSoft,
  },
  bannerText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: colors.error,
  },
});
