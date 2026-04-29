import React, { useEffect, useRef, useState } from 'react';
import { Keyboard, Text, View } from 'react-native';
import { Button, TextInput } from 'react-native-paper';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
import { ErrorBanner } from '@/components/ErrorBanner';
import { authApi, ApiError } from '@/api';
import { useAuthStore } from '@/store/authStore';
import { formatKzPhoneDisplay } from '@/utils/phone';
import { spacing } from '@/theme';
import { useStyles } from '@/theme/useStyles';
import type { AuthStackParamList } from '@/navigation/types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { KEYBOARD_TOOLBAR_ID } from '@/components/KeyboardToolbar';

type Props = NativeStackScreenProps<AuthStackParamList, 'Otp'>;

const RESEND_COOLDOWN = 60;

export default function OtpScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const { phone } = route.params;
  const setAuth = useAuthStore((s) => s.setAuth);

  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const styles = useStyles((c) => ({
    title: { fontSize: 24, fontWeight: '700' as const, color: c.onSurface, marginTop: spacing.lg },
    subtitle: { fontSize: 14, color: c.muted, marginTop: spacing.xs, marginBottom: spacing.lg },
    input: { marginBottom: spacing.sm, backgroundColor: c.surface },
    hint: { fontSize: 12, color: c.muted, marginBottom: spacing.md },
    button: { paddingVertical: spacing.xs },
    resendWrap: { alignItems: 'center' as const, marginTop: spacing.md },
    cooldown: { color: c.muted, fontSize: 14 },
  }));

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCooldown((sec) => (sec > 0 ? sec - 1 : 0));
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  const onChange = (raw: string) => {
    setCode(raw.replace(/\D/g, '').slice(0, 4));
    setError(null);
  };

  const onSubmit = async () => {
    if (code.length !== 4) {
      setError('Код должен состоять из 4 цифр');
      return;
    }
    Keyboard.dismiss();
    setLoading(true);
    setError(null);
    try {
      const res = await authApi.verifyOtp(phone, code);
      await setAuth(res.token, res.user);
      if (res.is_new_user) {
        navigation.navigate('CompleteProfile');
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('common.error_generic'));
    } finally {
      setLoading(false);
    }
  };

  const onResend = async () => {
    setError(null);
    setLoading(true);
    try {
      await authApi.requestOtp(phone);
      setCooldown(RESEND_COOLDOWN);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('common.error_generic'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen withTopInset>
      <Text style={styles.title}>{t('auth.otp_title')}</Text>
      <Text style={styles.subtitle}>
        {t('auth.otp_subtitle', { phone: formatKzPhoneDisplay(phone) })}
      </Text>

      <ErrorBanner message={error} />

      <TextInput
        mode="outlined"
        keyboardType="number-pad"
        inputAccessoryViewID={KEYBOARD_TOOLBAR_ID}
        value={code}
        onChangeText={onChange}
        placeholder={t('auth.otp_placeholder')}
        maxLength={4}
        style={styles.input}
        autoFocus
      />

      <Text style={styles.hint}>{t('auth.otp_hint')}</Text>

      <Button
        mode="contained"
        onPress={onSubmit}
        loading={loading}
        disabled={loading || code.length !== 4}
        style={styles.button}
      >
        {t('auth.otp_button')}
      </Button>

      <View style={styles.resendWrap}>
        {cooldown > 0 ? (
          <Text style={styles.cooldown}>
            {t('auth.otp_resend_in', { sec: cooldown })}
          </Text>
        ) : (
          <Button mode="text" onPress={onResend} disabled={loading}>
            {t('auth.otp_resend')}
          </Button>
        )}
      </View>
    </Screen>
  );
}
