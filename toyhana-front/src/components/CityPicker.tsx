import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { TextInput, List } from 'react-native-paper';

import { BottomModal } from './BottomModal';
import { dictName } from '@/utils/i18nDict';
import { useAuthStore } from '@/store/authStore';
import { spacing } from '@/theme';
import { useStyles } from '@/theme/useStyles';
import type { City } from '@/api/types';

interface Props {
  visible: boolean;
  cities: City[];
  onSelect: (city: City) => void;
  onClose: () => void;
}

export function CityPicker({ visible, cities, onSelect, onClose }: Props) {
  const lang = useAuthStore((s) => s.user?.language ?? 'ru');
  const [q, setQ] = useState('');

  const styles = useStyles((c) => ({
    title: { fontSize: 18, fontWeight: '700' as const, color: c.onSurface, marginBottom: spacing.md },
    search: { marginBottom: spacing.sm, backgroundColor: c.surface },
    list: { maxHeight: 400 },
    sep: { height: StyleSheet.hairlineWidth, backgroundColor: c.outline },
  }));

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return cities;
    return cities.filter((c) => {
      return (
        c.name_ru.toLowerCase().includes(needle) ||
        c.name_kz.toLowerCase().includes(needle)
      );
    });
  }, [q, cities]);

  return (
    <BottomModal visible={visible} onClose={onClose}>
      <Text style={styles.title}>Выберите город</Text>
      <TextInput
        mode="outlined"
        value={q}
        onChangeText={setQ}
        placeholder="Поиск"
        style={styles.search}
      />
      <FlatList
        data={filtered}
        keyExtractor={(c) => String(c.id)}
        style={styles.list}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <List.Item
            title={dictName(item, lang)}
            onPress={() => {
              onSelect(item);
              onClose();
              setQ('');
            }}
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
      />
    </BottomModal>
  );
}
