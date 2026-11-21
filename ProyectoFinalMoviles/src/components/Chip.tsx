import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, spacing } from '@/theme';

interface Props {
  text: string;
  active: boolean;
  onPress: () => void;
}

/** Selectable "pill" option. The active one is painted teal with a checkmark. */
export function Chip({ text, active, onPress }: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={[styles.chip, active && styles.active]}
    >
      {active && <Ionicons name="checkmark" size={14} color={colors.white} />}
      <Text style={[styles.text, active && styles.textActive]}>{text}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.m,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  active: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondary,
  },
  text: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.text,
  },
  textActive: {
    color: colors.white,
    fontWeight: '700',
  },
});
