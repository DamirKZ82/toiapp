import React, { useState } from 'react';
import { Keyboard, Text } from 'react-native';
import { Button, TextInput } from 'react-native-paper';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
import { ErrorBanner } from '@/components/ErrorBanner';
import { authApi, ApiError } from '@/api';
import { maskPhoneInput, normalizeKzPhone } from '@/utils/phone';
import { spacing } from '@/theme';
import { useStyles } from '@/theme/useStyles';
import type { AuthStackParamList } from '@/navigation/types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { KEYBOARD_TOOLBAR_ID } from '@/components/KeyboardToolbar';

type Props = NativeStackScreenProps<AuthStackParamList, 'Phone'>;

export default function PhoneScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const [input, setInput] = useState('+7 ');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const styles = useStyles((c) => ({
    title: { fontSize: 24, fontWeight: '700' as const, color: c.onSurface, marginTop: spacing.lg },
    subtitle: { fontSize: 14, color: c.muted, marginTop: spacing.xs, marginBottom: spacing.lg },
    input: { marginBottom: spacing.md, backgroundColor: c.surface },
    button: { paddingVertical: spacing.xs },
  }));

  const onChange = (raw: string) => {
    setInput(maskPhoneInput(raw));
    setError(null);
  };

  const onSubmit = async () => {
    const phone = normalizeKzPhone(input);
    if (!phone) {
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
        inputAccessoryViewID={KEYBOARD_TOOLBAR_ID}
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
