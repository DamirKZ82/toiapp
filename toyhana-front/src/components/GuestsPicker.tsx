import React, { useState, useEffect } from 'react';
import { Text, View } from 'react-native';
import { Button, TextInput } from 'react-native-paper';

import { BottomModal } from './BottomModal';
import { spacing } from '@/theme';
import { useStyles } from '@/theme/useStyles';
import { KEYBOARD_TOOLBAR_ID } from '@/components/KeyboardToolbar';

interface Props {
  visible: boolean;
  value: number | null;
  onChange: (v: number | null) => void;
  onClose: () => void;
  min?: number;
  max?: number;
}

export function GuestsPicker({ visible, value, onChange, onClose, min, max }: Props) {
  const [raw, setRaw] = useState(value !== null ? String(value) : '');

  const styles = useStyles((c) => ({
    title: { fontSize: 18, fontWeight: '700' as const, color: c.onSurface, marginBottom: spacing.sm },
    hint: { fontSize: 12, color: c.muted, marginBottom: spacing.sm },
    input: { backgroundColor: c.surface, marginBottom: spacing.md },
    actions: { flexDirection: 'row' as const, justifyContent: 'space-between' as const },
  }));

  useEffect(() => {
    if (visible) setRaw(value !== null ? String(value) : '');
  }, [visible, value]);

  const apply = () => {
    const n = parseInt(raw, 10);
    if (!Number.isFinite(n) || n <= 0) {
      onChange(null);
    } else {
      onChange(n);
    }
    onClose();
  };

  const rangeHint = (min != null && max != null) ? `от ${min} до ${max}` : null;

  return (
    <BottomModal visible={visible} onClose={onClose}>
      <Text style={styles.title}>Количество гостей</Text>
      {rangeHint ? <Text style={styles.hint}>Допустимо {rangeHint}</Text> : null}
      <TextInput
        mode="outlined"
        keyboardType="number-pad"
        inputAccessoryViewID={KEYBOARD_TOOLBAR_ID}
        value={raw}
        onChangeText={(t) => setRaw(t.replace(/\D/g, '').slice(0, 5))}
        placeholder="150"
        style={styles.input}
        autoFocus
      />
      <View style={styles.actions}>
        <Button mode="text" onPress={() => { setRaw(''); onChange(null); onClose(); }}>
          Сбросить
        </Button>
        <Button mode="contained" onPress={apply}>Готово</Button>
      </View>
    </BottomModal>
  );
}
