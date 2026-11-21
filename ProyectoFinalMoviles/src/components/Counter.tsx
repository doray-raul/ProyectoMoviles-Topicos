import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius } from '@/theme';

interface Props {
  value: number;
  min?: number;
  max: number;
  onChange: (value: number) => void;
}

/** Quantity selector with "minus" and "plus" buttons. */
export function Counter({ value, min = 1, max, onChange }: Props) {
  const canDecrease = value > min;
  const canIncrease = value < max;

  return (
    <View style={styles.container}>
      <Pressable
        onPress={() => onChange(value - 1)}
        disabled={!canDecrease}
        accessibilityLabel="Quitar uno"
        style={[styles.button, !canDecrease && styles.inactive]}
      >
        <Ionicons name="remove" size={18} color={colors.text} />
      </Pressable>
      <Text style={styles.value}>{value}</Text>
      <Pressable
        onPress={() => onChange(value + 1)}
        disabled={!canIncrease}
        accessibilityLabel="Agregar uno"
        style={[styles.button, !canIncrease && styles.inactive]}
      >
        <Ionicons name="add" size={18} color={colors.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.m,
    backgroundColor: colors.white,
  },
  button: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inactive: {
    opacity: 0.3,
  },
  value: {
    minWidth: 28,
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
});
