# Ребрендинг ToyHUB → ToiApp — действия для тебя

В коде я уже всё переименовал. Теперь надо обновить инфраструктуру: GitHub репо, Firebase, Expo проект, EAS env.

⏱️ Времени: ~30 минут активной работы + 30-60 минут на сборку APK.

---

## Шаг 1. Распакуй архив

Распакуй последний архив поверх `D:\Projects\toyhana\` как обычно. Замени все файлы.

## Шаг 2. Переименуй GitHub репозиторий

1. Зайди на https://github.com/DamirKZ82/toyhub
2. **Settings** → **General**
3. В верхнем разделе "Repository name": **`toyhub`** → **`toiapp`** → **Rename**
4. Старые ссылки автоматически редиректят, но обновим локальный remote:

```powershell
cd D:\Projects\toyhana
git remote set-url origin https://github.com/DamirKZ82/toiapp.git
git remote -v   # проверка — должен показать новый URL
```

## Шаг 3. Создай новый Firebase-проект (старый удали)

Старый Firebase-проект `ToyHUB` теперь ни к чему — bundle id поменялся, FCM ключ для другого пакета. Создаём новый.

1. Зайди на https://console.firebase.google.com
2. Открой проект **ToyHUB** → **Project settings** (шестерёнка) → внизу **Delete project**
3. На главной → **Add project** → название: **`ToiApp`** → создать
4. На главной нового проекта → **+ Add app** → **Android**
5. **Android package name**: `kz.toiapp.app` (точно так, регистронезависимо)
6. **App nickname**: `ToiApp`
7. **Register app**
8. **Download google-services.json**
9. Сохрани файл, замени им старый:

```powershell
Move-Item -Force C:\Users\<твой_юзер>\Downloads\google-services.json D:\Projects\toyhana\toyhana-front\google-services.json
```

## Шаг 4. Создай новый Expo-проект

Старый проект `damirrisbekov/toyhub` оставь как есть (или удали потом — не критично).

1. Удали из `app.json` строки с проектом-плейсхолдером:

```powershell
notepad D:\Projects\toyhana\toyhana-front\app.json
```

Найди:
```json
    "extra": {
      "apiBaseUrl": "http://10.0.2.2:4000",
      "eas": {
        "projectId": "WILL_BE_FILLED_BY_EAS_INIT"
      }
    },
    "owner": "WILL_BE_FILLED_AFTER_EXPO_LOGIN"
```

Замени на:
```json
    "extra": {
      "apiBaseUrl": "http://10.0.2.2:4000"
    }
```

(удали блок `eas` и поле `owner`)

Сохрани.

2. Создай новый Expo-проект:

```powershell
cd D:\Projects\toyhana\toyhana-front
eas init
```

Спросит:
- `Would you like to automatically create an EAS project?` → **Yes**
- `Project name?` → нажми Enter (по умолчанию `toiapp`)

EAS сам впишет правильные `projectId` и `owner` в `app.json`.

## Шаг 5. Создай EAS env-переменную для google-services

Старая переменная привязана к старому проекту. Делаем новую:

```powershell
eas env:create --scope project --name GOOGLE_SERVICES_JSON --type file --visibility secret --value ./google-services.json --environment preview
eas env:create --scope project --name GOOGLE_SERVICES_JSON --type file --visibility secret --value ./google-services.json --environment production
eas env:create --scope project --name GOOGLE_SERVICES_JSON --type file --visibility secret --value ./google-services.json --environment development
```

## Шаг 6. Обнови .gitignore (если ещё не убрал google-services)

Если в `.gitignore` остались эти строки — **удали** их (мы коммитим файл напрямую, так проще):

```
toyhana-front/google-services.json
GoogleService-Info.plist
google-services.json
```

```powershell
cd D:\Projects\toyhana
notepad .gitignore
```

Удали те строки если есть, сохрани.

## Шаг 7. Поправь app.json — убери $-syntax

Если в `app.json` сейчас `"googleServicesFile": "$GOOGLE_SERVICES_JSON"` — верни на путь:

```powershell
notepad toyhana-front\app.json
```

Найди:
```json
"googleServicesFile": "$GOOGLE_SERVICES_JSON",
```

Замени на:
```json
"googleServicesFile": "./google-services.json",
```

(Файл попадёт в репо через git, в EAS-сборке он есть. Env-переменная нужна как fallback на случай если кто-то будет собирать без файла локально.)

## Шаг 8. Закоммить всё

```powershell
cd D:\Projects\toyhana
git add .
git status
```

⚠️ Внимательно посмотри что попадает в коммит. **Должно быть**:
- `toyhana-front/google-services.json` (✓ коммитим, безопасно)
- `app.json` modified
- `splash.png` modified (поменял текст)
- остальной код с новым именем

**НЕ должно быть**:
- `.env`
- `node_modules/`
- `.venv/`

Если всё ок:

```powershell
git commit -m "Rebrand ToyHUB -> ToiApp, package kz.toiapp.app"
git push
```

## Шаг 9. Запусти сборку APK

```powershell
cd toyhana-front
eas build --platform android --profile preview
```

Спросит:
- Подтвердить пакетное имя `kz.toiapp.app` → **Yes**
- Сгенерировать новый Android Keystore → **Yes** (старый был для `com.toyhub.app`, не подойдёт)

Жди 30-60 минут. Получишь APK с **новым** именем ToiApp и иконкой.

## Шаг 10. Установи и проверь

Скачай APK с expo.dev → перешли на Android → установи.

⚠️ **Удали сначала старое приложение ToyHUB с телефона** — у них разные package id, можно поставить параллельно, но запутаешься.

---

## После всего

Старый APK ToyHUB можно удалить со всех устройств. Старый Firebase-проект — удалить. Старый Expo-проект — удалить.

Если возникнут ошибки на любом шаге — пришли скрин/текст, разберём.
