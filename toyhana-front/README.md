# Toyhana — Mobile App (React Native / Expo)

Финальная сборка MVP: все 14 экранов, auth + клиент + владелец.

## Стек

- **Expo SDK 54** + TypeScript
- **React Native Paper** — Material 3
- **React Navigation** v7 — AuthStack + 4 таба (Поиск, Избранное, Мои заявки, Профиль)
- **Zustand** — стор токена, профиля, избранного
- **expo-secure-store** — зашифрованное хранение JWT
- **axios** — с interceptors (Bearer, 401→logout, 5xx→/front-error)
- **i18next** — ru/kz
- **expo-image-picker** — множественная загрузка фото
- **react-native-calendars** — календарь с раскраской занятости

## Требования

- Node.js 20+
- Expo Go на телефоне
- Компьютер и телефон в одной Wi-Fi сети

## Установка

```bash
cd toyhana-front
npm install
```

Если конфликт peer-зависимостей — `npm install --legacy-peer-deps`.

## Настройка адреса бэка

Открой `app.json`, подставь IP компьютера в `extra.apiBaseUrl`:

```json
"extra": {
  "apiBaseUrl": "http://192.168.X.X:4000"
}
```

Узнать IP: `ipconfig` → `IPv4-адрес` Wi-Fi адаптера.

## Запуск

В отдельных окнах:

```bash
# Бэк
cd toyhana-back
python main.py

# Фронт
cd toyhana-front
npm start
```

На главном экране Expo Go введи URL `exp://192.168.X.X:8081` (смотри в консоли после `npm start`).

## Вход

Любой казахстанский номер. В консоли бэка увидишь код — используй его (в dev-режиме всегда `0000`).

## Структура

```
toyhana-front/
├── App.tsx                   # точка входа
├── app.json                  # Expo config
├── package.json              # SDK 54
├── src/
│   ├── api/                  # axios + эндпоинты с TS-типами
│   │   ├── auth.ts
│   │   ├── bookings.ts
│   │   ├── client.ts
│   │   ├── dicts.ts
│   │   ├── favorites.ts
│   │   ├── halls.ts          # публичные детали (C02)
│   │   ├── ownerHalls.ts     # CRUD залов владельца (O04)
│   │   ├── profile.ts
│   │   ├── reviews.ts
│   │   ├── search.ts
│   │   ├── types.ts
│   │   └── venues.ts
│   ├── components/           # 12 переиспользуемых
│   ├── config/               # API_BASE_URL
│   ├── i18n/                 # ru/kz + init
│   ├── navigation/           # 4 стека + RootNavigator
│   ├── screens/
│   │   ├── auth/             # A01 Phone, A02 Otp, A03 CompleteProfile
│   │   ├── client/           # C01..C06
│   │   ├── common/           # G01 Profile
│   │   └── owner/            # O01..O08
│   ├── store/                # authStore + favoritesStore
│   ├── theme/                # цвета, Paper theme
│   └── utils/                # phone, format, push (отключен до этапа 11)
```

## Push-уведомления

**Сейчас отключены.** В Expo Go (SDK 54) push-уведомления на Android убраны, iOS требует projectId через EAS. Код регистрации готов в `src/utils/push.ts`, включим на этапе 11 одновременно с dev-build для 2GIS-карты.

Сейчас бэк при событиях (новая заявка, подтверждение, отказ) пишет в консоль `🔕 Push skipped` — это ок, логика пушей отработает сразу, как только подключим токены.

## Команды

```bash
npm start            # Expo DevTools + QR
npm run typecheck    # TypeScript
```

## Следующие этапы

- **Этап 11** — prod deploy: VPS + PostgreSQL + Nginx + HTTPS + реальная SMS + Firebase project + 2GIS MapKit + dev-build + включение пушей.
- **Этап 12** — Google Play Store: EAS-сборка, материалы, модерация.
