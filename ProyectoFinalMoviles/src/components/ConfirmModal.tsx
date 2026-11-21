import { Ionicons } from '@expo/vector-icons';
import { Modal, StyleSheet, Text, View } from 'react-native';

import { Button } from './Button';
import { colors, spacing, radius } from '@/theme';

interface Props {
  visible: boolean;
  title: string;
  message: string;
  confirmText: string;
  icon?: keyof typeof Ionicons.glyphMap;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Custom confirmation dialog.
 * Used instead of Alert.alert because in the browser Alert does not show buttons.
 */
export function ConfirmModal({
  visible,
  title,
  message,
  confirmText,
  icon = 'warning-outline',
  loading,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.background}>
        <View style={styles.box}>
          <View style={styles.icon}>
            <Ionicons name={icon} size={28} color={colors.error} />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
          <View style={styles.buttons}>
            <View style={styles.button}>
              <Button text="No, cancelar" variant="outline" onPress={onCancel} disabled={loading} />
            </View>
            <View style={styles.button}>
              <Button text={confirmText} variant="danger" onPress={onConfirm} loading={loading} />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    backgroundColor: 'rgba(28, 29, 33, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  box: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.white,
    borderRadius: radius.l,
    padding: spacing.xl,
    gap: spacing.m,
    alignItems: 'center',
  },
  icon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.errorSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
    textAlign: 'center',
  },
  buttons: {
    flexDirection: 'row',
    gap: spacing.m,
    marginTop: spacing.s,
    alignSelf: 'stretch',
  },
  button: {
    flex: 1,
  },
});
