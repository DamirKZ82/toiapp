import React, { useState } from 'react';
import { Keyboard, StyleSheet, Text } from 'react-native';
import { Button, TextInput } from 'react-native-paper';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
import { ErrorBanner } from '@/components/ErrorBanner';
import { authApi, ApiError } from '@/api';
import { maskPhoneInput, normalizeKzPhone } from '@/utils/phone';
import { colors, spacing } from '@/theme';
import type { AuthStackParamList } from '@/navigation/types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<AuthStackParamList, 'Phone'>;

export default function PhoneScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [input, setInput] = useState('+7 ');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onChange = (raw: string) => {
    setInput(maskPhoneInput(raw));
    setError(null);
  };

  const onSubmit = async () => {
    const phone = normalizeKzPhone(input);
    if (!phone) {
      setError(t('auth.phone_subtitle')); // простейшее сообщение, серверная валидация даст точную
      setError('Некорректный номер. Формат: +7 (7XX) XXX XX XX');
      return;
    }
    Keyboard.dismiss();
    setLoading(true);
    setError(null);
    try {
      await authApi.requestOtp(phone);
      navigation.navigate('Otp', { phone });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('common.error_generic'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen withTopInset>
      <Text style={styles.title}>{t('auth.phone_title')}</Text>
      <Text style={styles.subtitle}>{t('auth.phone_subtitle')}</Text>

      <ErrorBanner message={error} />

      <TextInput
        mode="outlined"
        keyboardType="phone-pad"
        value={input}
        onChangeText={onChange}
        placeholder={t('auth.phone_placeholder')}
        style={styles.input}
        autoFocus
      />

      <Button
        mode="contained"
        onPress={onSubmit}
        loading={loading}
        disabled={loading}
        style={styles.button}
      >
        {t('auth.phone_button')}
      </Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '700', color: colors.onSurface, marginTop: spacing.lg },
  subtitle: { fontSize: 14, color: colors.muted, marginTop: spacing.xs, marginBottom: spacing.lg },
  input: { marginBottom: spacing.md, backgroundColor: colors.surface },
  button: { paddingVertical: spacing.xs },
});
