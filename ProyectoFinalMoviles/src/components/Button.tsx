import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, spacing, radius } from '@/theme';

type Variant = 'primary' | 'secondary' | 'outline' | 'danger';

interface Props {
  text: string;
  onPress: () => void;
  variant?: Variant;
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  small?: boolean;
}

// primary: main action of the screen (shrimp red)
// secondary: important alternative action (teal)
// outline: neutral action, like "Cancelar"
// danger: actions that delete something
const VARIANT_STYLES: Record<Variant, { background: string; text: string; border: string }> = {
  primary: { background: colors.primary, text: colors.white, border: colors.primary },
  secondary: { background: colors.secondary, text: colors.white, border: colors.secondary },
  outline: { background: colors.white, text: colors.text, border: colors.border },
  danger: { background: colors.white, text: colors.error, border: colors.error },
};

export function Button({ text, onPress, variant = 'primary', icon, loading, disabled, small }: Props) {
  const palette = VARIANT_STYLES[variant];
  const inactive = loading || disabled;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={text}
      style={({ pressed }) => [
        styles.button,
        small && styles.small,
        { backgroundColor: palette.background, borderColor: palette.border },
        pressed && styles.pressed,
        inactive && styles.inactive,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.text} />
      ) : (
        <View style={styles.content}>
          {icon && <Ionicons name={icon} size={small ? 16 : 19} color={palette.text} />}
          <Text style={[styles.text, small && styles.textSmall, { color: palette.text }]}>{text}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    paddingHorizontal: spacing.l,
    borderRadius: radius.m,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  small: {
    minHeight: 38,
    paddingHorizontal: spacing.m,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
  },
  text: {
    fontSize: 15,
    fontWeight: '700',
  },
  textSmall: {
    fontSize: 13,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  inactive: {
    opacity: 0.5,
  },
});
