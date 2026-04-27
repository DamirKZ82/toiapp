import React, { useState } from 'react';
import { Keyboard, Text, View } from 'react-native';
import { Button, SegmentedButtons, TextInput } from 'react-native-paper';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
import { ErrorBanner } from '@/components/ErrorBanner';
import { authApi, ApiError } from '@/api';
import { useAuthStore } from '@/store/authStore';
import { spacing } from '@/theme';
import { useStyles } from '@/theme/useStyles';

export default function CompleteProfileScreen() {
  const { t } = useTranslation();
  const setUser = useAuthStore((s) => s.setUser);
  const currentLang = useAuthStore((s) => s.user?.language ?? 'ru');

  const [fullName, setFullName] = useState('');
  const [language, setLanguage] = useState<'ru' | 'kz'>(currentLang);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const styles = useStyles((c) => ({
    title: { fontSize: 24, fontWeight: '700' as const, color: c.onSurface, marginTop: spacing.lg },
    subtitle: { fontSize: 14, color: c.muted, marginTop: spacing.xs, marginBottom: spacing.lg },
    input: { marginBottom: spacing.md, backgroundColor: c.surface },
    langLabel: { fontSize: 14, color: c.muted, marginBottom: spacing.sm },
    segments: { marginBottom: spacing.lg },
    button: { paddingVertical: spacing.xs, marginBottom: spacing.md },
  }));

  const onSubmit = async () => {
    if (!fullName.trim()) {
      setError('Имя не может быть пустым');
      return;
    }
    Keyboard.dismiss();
    setLoading(true);
    setError(null);
    try {
      const res = await authApi.completeProfile(fullName.trim(), language);
      await setUser(res.user);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('common.error_generic'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen withTopInset>
      <Text style={styles.title}>{t('auth.profile_title')}</Text>
      <Text style={styles.subtitle}>{t('auth.profile_subtitle')}</Text>

      <ErrorBanner message={error} />

      <TextInput
        mode="outlined"
        value={fullName}
        onChangeText={(v) => { setFullName(v); setError(null); }}
        placeholder={t('auth.full_name_placeholder')}
        style={styles.input}
        autoFocus
      />

      <Text style={styles.langLabel}>{t('auth.language_label')}</Text>
      <SegmentedButtons
        value={language}
        onValueChange={(v) => setLanguage(v as 'ru' | 'kz')}
        buttons={[
          { value: 'ru', label: t('auth.language_ru') },
          { value: 'kz', label: t('auth.language_kz') },
        ]}
        style={styles.segments}
      />

      <View style={{ flex: 1 }} />

      <Button
        mode="contained"
        onPress={onSubmit}
        loading={loading}
        disabled={loading}
        style={styles.button}
      >
        {t('auth.profile_save')}
      </Button>
    </Screen>
  );
}
