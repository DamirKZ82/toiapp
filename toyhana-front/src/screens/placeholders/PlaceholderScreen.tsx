import React from 'react';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/Screen';
import { EmptyState } from '@/components/EmptyState';

export function makePlaceholderScreen(hintKey: string) {
  return function Placeholder() {
    const { t } = useTranslation();
    return (
      <Screen>
        <EmptyState
          title={t('placeholder.coming_soon')}
          subtitle={t(hintKey)}
        />
      </Screen>
    );
  };
}

export const SearchPlaceholder = makePlaceholderScreen('placeholder.search_hint');
export const FavoritesPlaceholder = makePlaceholderScreen('placeholder.favorites_hint');
export const BookingsPlaceholder = makePlaceholderScreen('placeholder.bookings_hint');
