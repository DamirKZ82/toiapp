import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Button, TextInput } from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
import { Loader } from '@/components/Loader';
import { ErrorBanner } from '@/components/ErrorBanner';
import { CityPicker } from '@/components/CityPicker';

import { dictsApi, venuesApi, ApiError } from '@/api';
import type { City } from '@/api/types';
import { dictName } from '@/utils/i18nDict';
import { useAuthStore } from '@/store/authStore';
import { colors, radii, spacing } from '@/theme';
import type { ProfileStackParamList } from '@/navigation/types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<ProfileStackParamList, 'VenueForm'>;

export default function VenueFormScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const lang = useAuthStore((s) => s.user?.language ?? 'ru');
  const editingGuid = route.params.venueGuid;
  const isEdit = !!editingGuid;

  const [cities, setCities] = useState<City[]>([]);
  const [city, setCity] = useState<City | null>(null);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');

  const [cityOpen, setCityOpen] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [c, venue] = await Promise.all([
          dictsApi.cities(),
          isEdit ? venuesApi.get(editingGuid!) : Promise.resolve(null),
        ]);
        setCities(c.items);
        if (venue) {
          const v = venue.venue;
          setCity(c.items.find((ci) => ci.id === v.city_id) ?? null);
          setName(v.name);
          setAddress(v.address);
          setDescription(v.description ?? '');
          setPhone(v.phone ?? '');
          setLat(v.latitude != null ? String(v.latitude) : '');
          setLng(v.longitude != null ? String(v.longitude) : '');
        }
      } catch (e) {
        setError(e instanceof ApiError ? e.message : t('common.error_generic'));
      } finally {
        setLoading(false);
      }
    })();
  }, [editingGuid, isEdit, t]);

  const submit = async () => {
    if (!city) { setError(t('owner.venue_city_placeholder')); return; }
    if (!name.trim()) { setError(t('owner.venue_name_label')); return; }
    if (!address.trim()) { setError(t('owner.venue_address_label')); return; }

    const body = {
      city_id: city.id,
      name: name.trim(),
      address: address.trim(),
      description: description.trim() || null,
      phone: phone.trim() || null,
      latitude: lat.trim() ? parseFloat(lat.replace(',', '.')) : null,
      longitude: lng.trim() ? parseFloat(lng.replace(',', '.')) : null,
    };

    setSaving(true);
    setError(null);
    try {
      if (isEdit) {
        await venuesApi.patch(editingGuid!, body);
      } else {
        await venuesApi.create(body);
      }
      navigation.goBack();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('common.error_generic'));
    } finally {
      setSaving(false);
    }
  };

  const remove = () => {
    if (!editingGuid) return;
    Alert.alert(
      t('owner.delete_venue_confirm_title'),
      t('owner.delete_venue_confirm_text'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await venuesApi.remove(editingGuid);
              navigation.popToTop();
              navigation.navigate('MyVenues');
            } catch (e) {
              setError(e instanceof ApiError ? e.message : t('common.error_generic'));
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
  };

  if (loading) return <Screen><Loader /></Screen>;

  return (
    <Screen scroll>
      <ErrorBanner message={error} />

      <Label>{t('owner.venue_city_label')}</Label>
      <Pressable style={styles.dropdown} onPress={() => setCityOpen(true)}>
        <Icon name="map-marker" size={18} color={colors.muted} />
        <Text style={[styles.dropdownText, !city && styles.placeholder]}>
          {city ? dictName(city, lang) : t('owner.venue_city_placeholder')}
        </Text>
      </Pressable>

      <Label>{t('owner.venue_name_label')}</Label>
      <TextInput
        mode="outlined"
        value={name}
        onChangeText={setName}
        placeholder={t('owner.venue_name_placeholder')}
        style={styles.input}
      />

      <Label>{t('owner.venue_address_label')}</Label>
      <TextInput
        mode="outlined"
        value={address}
        onChangeText={setAddress}
        placeholder={t('owner.venue_address_placeholder')}
        style={styles.input}
      />

      <Label>{t('owner.venue_description_label')}</Label>
      <TextInput
        mode="outlined"
        value={description}
        onChangeText={setDescription}
        placeholder={t('owner.venue_description_placeholder')}
        multiline
        numberOfLines={3}
        style={[styles.input, { minHeight: 80 }]}
      />

      <Label>{t('owner.venue_phone_label')}</Label>
      <TextInput
        mode="outlined"
        value={phone}
        onChangeText={setPhone}
        placeholder={t('owner.venue_phone_placeholder')}
        keyboardType="phone-pad"
        style={styles.input}
      />

      <Label>{t('owner.coordinates_label')}</Label>
      <Text style={styles.hint}>{t('owner.coordinates_hint')}</Text>
      <View style={styles.row}>
        <TextInput
          mode="outlined"
          value={lat}
          onChangeText={(v) => setLat(v.replace(/[^0-9.,\-]/g, ''))}
          placeholder={t('owner.latitude')}
          keyboardType="numbers-and-punctuation"
          style={[styles.input, styles.halfInput]}
        />
        <TextInput
          mode="outlined"
          value={lng}
          onChangeText={(v) => setLng(v.replace(/[^0-9.,\-]/g, ''))}
          placeholder={t('owner.longitude')}
          keyboardType="numbers-and-punctuation"
          style={[styles.input, styles.halfInput]}
        />
      </View>

      <Button
        mode="contained"
        onPress={submit}
        loading={saving}
        disabled={saving}
        style={styles.submit}
      >
        {t('common.save')}
      </Button>

      {isEdit ? (
        <Button
          mode="outlined"
          onPress={remove}
          loading={deleting}
          disabled={deleting}
          textColor={colors.error}
          style={styles.deleteBtn}
        >
          {t('owner.delete_venue')}
        </Button>
      ) : null}

      <CityPicker
        visible={cityOpen}
        cities={cities}
        onSelect={(c) => setCity(c)}
        onClose={() => setCityOpen(false)}
      />
    </Screen>
  );
}

function Label({ children }: { children: string }) {
  return <Text style={styles.label}>{children}</Text>;
}

const styles = StyleSheet.create({
  label: {
    fontSize: 13, fontWeight: '600', color: colors.muted,
    textTransform: 'uppercase', marginTop: spacing.md, marginBottom: spacing.sm,
  },
  hint: { fontSize: 12, color: colors.muted, marginBottom: spacing.sm },
  dropdown: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: colors.outline, borderRadius: radii.sm,
    paddingHorizontal: spacing.md, paddingVertical: 14,
    backgroundColor: colors.surface,
  },
  dropdownText: { marginLeft: spacing.sm, fontSize: 15, color: colors.onSurface },
  placeholder: { color: colors.muted },
  input: { backgroundColor: colors.surface, marginBottom: spacing.xs },
  row: { flexDirection: 'row', gap: spacing.sm },
  halfInput: { flex: 1 },
  submit: { marginTop: spacing.lg, paddingVertical: spacing.xs },
  deleteBtn: { marginTop: spacing.md, marginBottom: spacing.lg, borderColor: colors.error },
});
