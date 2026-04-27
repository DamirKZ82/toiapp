import React, { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { Button, TextInput } from 'react-native-paper';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
import { ErrorBanner } from '@/components/ErrorBanner';

import { reviewsApi, ApiError } from '@/api';
import { colors, spacing } from '@/theme';
import type { ProfileStackParamList } from '@/navigation/types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<ProfileStackParamList, 'ReviewReply'>;

export default function ReviewReplyScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const { reviewGuid, hallName, currentText } = route.params;

  const [text, setText] = useState(currentText ?? '');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!text.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await reviewsApi.reply(reviewGuid, text.trim());
      navigation.goBack();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('common.error_generic'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Screen>
      <Text style={styles.title}>{t('owner.review_reply_title')}</Text>
      <Text style={styles.hallName}>{hallName}</Text>

      <ErrorBanner message={error} />

      <Text style={styles.label}>{t('owner.review_reply_label')}</Text>
      <TextInput
        mode="outlined"
        value={text}
        onChangeText={setText}
        placeholder={t('owner.review_reply_placeholder')}
        multiline
        numberOfLines={5}
        style={styles.input}
        autoFocus
      />

      <Button
        mode="contained"
        onPress={submit}
        loading={submitting}
        disabled={submitting || !text.trim()}
        style={styles.submit}
      >
        {t('owner.review_reply_submit')}
      </Button>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '700', color: colors.onSurface, marginTop: spacing.md },
  hallName: { fontSize: 15, color: colors.muted, marginTop: 4, marginBottom: spacing.lg },
  label: {
    fontSize: 13, fontWeight: '600', color: colors.muted,
    textTransform: 'uppercase', marginTop: spacing.md, marginBottom: spacing.sm,
  },
  input: { backgroundColor: colors.surface, minHeight: 140 },
  submit: { marginTop: spacing.lg, paddingVertical: spacing.xs },
});
