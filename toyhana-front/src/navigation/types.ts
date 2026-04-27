import type { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  Phone: undefined;
  Otp: { phone: string };
  CompleteProfile: undefined;
};

/** Поиск → Карточка зала → Форма брони */
export type SearchStackParamList = {
  SearchHome: undefined;
  HallDetails: { hallGuid: string };
  BookingForm: { hallGuid: string; initialDate?: string };
};

/** Избранное → Карточка зала */
export type FavoritesStackParamList = {
  FavoritesHome: undefined;
  HallDetails: { hallGuid: string };
  BookingForm: { hallGuid: string; initialDate?: string };
};

/** Сообщения → Чат */
export type MessagesStackParamList = {
  MessagesHome: undefined;
  Chat: { chatGuid: string };
};

/** Профиль → Мои заведения / Входящие заявки / Мои заявки (перенесено из табов) */
export type ProfileStackParamList = {
  ProfileHome: undefined;
  MyVenues: undefined;
  VenueForm: { venueGuid?: string };
  VenueDetails: { venueGuid: string };
  HallForm: { venueGuid: string; hallGuid?: string };
  HallCalendar: { hallGuid: string; hallName: string };
  IncomingBookings: undefined;
  BookingDetails: { bookingGuid: string };
  ReviewReply: { reviewGuid: string; hallName: string; currentText: string | null };
  // Из бывшего BookingsStack
  MyBookings: undefined;
  ReviewForm: { bookingGuid: string; hallName: string };
  HallDetails: { hallGuid: string };
};

export type AppTabParamList = {
  Search: NavigatorScreenParams<SearchStackParamList>;
  Favorites: NavigatorScreenParams<FavoritesStackParamList>;
  Messages: NavigatorScreenParams<MessagesStackParamList>;
  Profile: NavigatorScreenParams<ProfileStackParamList>;
};

export type RootStackParamList = {
  Auth: undefined;
  App: undefined;
};
