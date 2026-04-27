# EAS Build — следующие шаги для тебя

После распаковки архива выполни последовательно.

## 1. Скопируй `google-services.json`

Файл который ты скачал из Firebase — положи в:

```
D:\Projects\toyhana\toyhana-front\google-services.json
```

(Прямо в папку фронта, рядом с `app.json`.)

⚠️ **НЕ КОММИТЬ** этот файл в git. Я добавлю строку в `.gitignore` ниже.

## 2. Обнови `.gitignore`

Открой `D:\Projects\toyhana\.gitignore` в Блокноте, добавь в конец:

```
# Firebase (содержит API-ключи)
toyhana-front/google-services.json
toyhana-front/GoogleService-Info.plist
```

Сохрани.

## 3. Установи EAS CLI

В PowerShell (от обычного юзера, не админ):

```powershell
npm install -g eas-cli
eas --version
```

Должна быть версия `>= 12.0.0`.

## 4. Войди в свой Expo-аккаунт

```powershell
eas login
```

Введи email + пароль с https://expo.dev.

Проверка:
```powershell
eas whoami
```

Должно показать твой username (например `damirkz82`).

## 5. Перейди в фронт и обнови owner в `app.json`

```powershell
cd D:\Projects\toyhana\toyhana-front
```

**Открой `app.json` в Блокноте**, найди в самом конце строку:

```json
"owner": "WILL_BE_FILLED_AFTER_EXPO_LOGIN"
```

Замени `WILL_BE_FILLED_AFTER_EXPO_LOGIN` на твой username из Expo (что показал `eas whoami`).

Например:
```json
"owner": "damirkz82"
```

Сохрани.

## 6. Инициализируй EAS-проект

```powershell
eas init
```

Спросит:
- `Would you like to automatically create an EAS project?` → **Yes**
- `Project name?` → **toyhub** (по умолчанию)

После этого EAS создаст ID проекта и **сам подставит его в `app.json`** в поле `extra.eas.projectId`.

## 7. Пересобери node_modules

После всех правок надо переустановить пакеты:

```powershell
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install --legacy-peer-deps
```

## 8. Запусти сборку APK

```powershell
eas build --platform android --profile preview
```

Что будет:
- Спросит подтвердить пакетное имя `com.toyhub.app` → **Yes**
- Спросит про подписи (keystore): `Generate a new Android Keystore?` → **Yes**
  - EAS сам создаст ключ подписи (хранится у Expo)
- Затем загрузит код на серверы Expo, начнёт сборку
- Откроется ссылка типа `https://expo.dev/accounts/damirkz82/projects/toyhub/builds/<id>`
- Сборка идёт **20-90 минут** (на free плане)

⚠️ Не закрывай PowerShell, а лучше открой ссылку в браузере и следи там.

## 9. Когда готово

В браузере на странице билда — кнопка **Download**. Скачаешь APK файл (~50 MB).

Установка:
- На Android: открой APK на телефоне → "Установить". Возможно потребуется разрешить установку из неизвестных источников.
- Тебе на iPhone — APK не подходит, файл для Android. Чтобы тестировать на iPhone — нужен IPA (см. `Apple Developer $99/год`).

## 10. Закоммить изменения

```powershell
cd D:\Projects\toyhana
git add .
git commit -m "Brand: rename to ToyHUB, add Android EAS Build config"
git push
```

⚠️ **Перед push убедись** что `git status` не показывает `google-services.json`. Если показывает — `.gitignore` не сработал, поправь его.

---

## Проблемы, которые могут возникнуть

### "EAS project ID is not configured"
Не сделал шаг 6 (`eas init`).

### "googleServicesFile path is invalid"
Файл `google-services.json` не на месте. Должен лежать в `toyhana-front/google-services.json`.

### "Invalid bundle identifier"
В Firebase ты ввёл другое package name. Должно быть **точно** `com.toyhub.app`. Если в Firebase не так — пересоздай Android-приложение в Firebase или поменяй `app.json`.

### Сборка зависла "in queue" 30+ минут
Free плана — нормально. Подожди. Если 2 часа — проверь expo.dev/queue, иногда у них факапы.

### Сборка упала с ошибкой
Скопируй последние 30-50 строк лога с страницы билда и пришли мне. Разберём.
