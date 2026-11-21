import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, radius } from '@/theme';

interface Props {
  stepNumber: number;
  title: string;
  help?: string;
  children: ReactNode;
}

/** Numbered block of a form, so the order in which it is filled is clear. */
export function FormStep({ stepNumber, title, help, children }: Props) {
  return (
    <View style={styles.step}>
      <View style={styles.header}>
        <View style={styles.stepNumber}>
          <Text style={styles.stepNumberText}>{stepNumber}</Text>
        </View>
        <View style={styles.flex}>
          <Text style={styles.title}>{title}</Text>
          {help ? <Text style={styles.help}>{help}</Text> : null}
        </View>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  step: {
    backgroundColor: colors.white,
    borderRadius: radius.l,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.l,
    gap: spacing.m,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.m,
  },
  flex: {
    flex: 1,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    color: colors.white,
    fontWeight: '800',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  help: {
    fontSize: 13,
    color: colors.textMuted,
    lineHeight: 18,
  },
});
