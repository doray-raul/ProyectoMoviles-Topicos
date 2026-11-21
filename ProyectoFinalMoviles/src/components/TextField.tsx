import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

import { colors, spacing, radius } from '@/theme';

interface Props extends TextInputProps {
  label: string;
  help?: string;
  error?: string;
}

/** TextInput with a label on top, optional help text and the field error message below. */
export function TextField({ label, help, error, style, ...props }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        placeholderTextColor="#A3A7AD"
        style={[styles.input, props.multiline && styles.multiline, error ? styles.inputError : null, style]}
        {...props}
      />
      {error ? <Text style={styles.error}>{error}</Text> : help ? <Text style={styles.help}>{help}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  input: {
    minHeight: 48,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.m,
    paddingHorizontal: spacing.m,
    backgroundColor: colors.white,
    fontSize: 15,
    color: colors.text,
  },
  multiline: {
    minHeight: 96,
    paddingTop: spacing.m,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: colors.error,
  },
  help: {
    fontSize: 12,
    color: colors.textMuted,
  },
  error: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.error,
  },
});
