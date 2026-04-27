import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { radii, spacing } from '@/theme';
import { useThemeColors } from '@/theme/useThemeColors';

interface Props {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function BottomModal({ visible, onClose, children }: Props) {
  const colors = useThemeColors();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable
        style={[styles.backdrop, { backgroundColor: colors.backdrop }]}
        onPress={onClose}
      />
      <View style={[styles.sheet, { backgroundColor: colors.surface }]}>{children}</View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1 },
  sheet: {
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    padding: spacing.md,
    paddingBottom: spacing.lg,
    maxHeight: '85%',
  },
});
