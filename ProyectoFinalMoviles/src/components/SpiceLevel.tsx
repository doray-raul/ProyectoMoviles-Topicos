import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors, SPICE_NAMES } from '@/theme';

/** Spice level (0 to 3): flames plus the level name, so it is clear without guessing. */
export function SpiceLevel({ level, size = 14 }: { level: number; size?: number }) {
  return (
    <View style={styles.row}>
      {level > 0 &&
        [1, 2, 3].map((n) => (
          <Ionicons key={n} name={n <= level ? 'flame' : 'flame-outline'} size={size} color={colors.primary} />
        ))}
      <Text style={[styles.text, { fontSize: size - 2 }]}>{SPICE_NAMES[level] ?? ''}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  text: {
    marginLeft: 4,
    color: colors.textMuted,
  },
});
