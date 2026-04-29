import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { radii, spacing } from '@/theme';
import { useThemeColors } from '@/theme/useThemeColors';
import { useSafeBottomInset } from '@/utils/useSafeBottomInset';

interface Props {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function BottomModal({ visible, onClose, children }: Props) {
  const colors = useThemeColors();
  const safeBottom = useSafeBottomInset();
  const bottomPadding = spacing.lg + safeBottom;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
      navigationBarTranslucent={false}
    >
      <Pressable
        style={[styles.backdrop, { backgroundColor: colors.backdrop }]}
        onPress={onClose}
      />
      <View
        style={[
          styles.sheet,
          { backgroundColor: colors.surface, paddingBottom: bottomPadding },
        ]}
      >
        {children}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1 },
  sheet: {
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    padding: spacing.md,
    maxHeight: '85%',
  },
});
