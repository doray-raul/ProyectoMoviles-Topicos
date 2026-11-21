import { StyleSheet, Text, View } from 'react-native';

import { Button } from './Button';
import { colors, spacing } from '@/theme';

interface Props {
  page: number;
  totalPages: number;
  totalItems: number;
  onChange: (page: number) => void;
}

/** "Previous / Next" controls for the API paginated lists. */
export function Paginator({ page, totalPages, totalItems, onChange }: Props) {
  if (totalPages <= 1) return null;

  return (
    <View style={styles.container}>
      <View style={styles.button}>
        <Button
          text="Anterior"
          icon="chevron-back"
          variant="outline"
          small
          disabled={page <= 1}
          onPress={() => onChange(page - 1)}
        />
      </View>

      <View style={styles.center}>
        <Text style={styles.page}>
          Página {page} de {totalPages}
        </Text>
        <Text style={styles.summary}>{totalItems} en total</Text>
      </View>

      <View style={styles.button}>
        <Button
          text="Siguiente"
          icon="chevron-forward"
          variant="outline"
          small
          disabled={page >= totalPages}
          onPress={() => onChange(page + 1)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.m,
    paddingVertical: spacing.l,
  },
  button: {
    minWidth: 110,
  },
  center: {
    alignItems: 'center',
  },
  page: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  summary: {
    fontSize: 12,
    color: colors.textMuted,
  },
});
