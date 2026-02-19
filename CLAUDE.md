# Инструкция для ИИ агентов — VocabCardsApp

## Стек

- **React Native 0.76** + **Expo 52** + **Expo Router v4** (файловая маршрутизация)
- **NativeWind v4** (Tailwind CSS для RN) — стилизация через `className`
- **expo-sqlite v15** — локальная SQLite БД, синхронный `getDB()`
- **TypeScript** — строгие типы, никаких `any`
- **expo-haptics** — уже установлен, использовать на ключевых действиях

---

## Архитектура навигации

```
app/_layout.tsx          ← корневой Stack (headerShown: false)
app/(tabs)/_layout.tsx   ← Tabs (все вкладки)
app/(tabs)/index.tsx     ← вкладка Список (рендерит CardListScreen)
app/(tabs)/card.tsx      ← вкладка Карточка (рендерит MainCardScreen)
app/(tabs)/add.tsx       ← вкладка Добавить
app/(tabs)/library.tsx   ← вкладка Библиотека
app/(tabs)/csv.tsx       ← вкладка CSV
app/(tabs)/quiz.tsx      ← вкладка Квиз
app/(tabs)/repeat.tsx    ← вкладка Повтор
app/edit.tsx             ← Stack-экран редактирования (НЕ вкладка, нет таб-бара)
```

Правило: экраны, которые должны открываться поверх таб-бара (edit, детали) — кладутся в `app/`, а не в `app/(tabs)/`.

---

## Структура проекта

```
components/
  card/          — FlipCard, FlipCardNavigator, FrontCard, BackCard, Card
  ui/            — Button, Input, SearchInput, EmptyState, Toast, ConfirmDialog, IconSymbol
  ErrorBoundary.tsx
constants/
  layout.ts      — FLOATING_PANEL_GAP, CONTENT_BOTTOM_PADDING, QUIZ_CONTENT_BOTTOM_PADDING
context/
  AppContext.tsx  — currentLanguageId, currentDictionaryId (персистятся в AsyncStorage)
database/
  database.ts    — initDatabase(), getDB()
models/
  CardModel.ts
  DictionaryModel.ts
  LanguageModel.ts
screens/          — тяжёлые screen-компоненты (CardListScreen, MainCardScreen)
types/
  TCard.ts       — TCard, TExample, CardRow
```

---

## Правила написания кода

### Стилизация
- Использовать `className` с NativeWind-классами везде где возможно.
- Цветовая палитра: `primary-900` (фон), `primary-800` (карточки), `primary-300` (поля), `primary-100`/`#d9ebeb` (текст), `accent-600` (акцент/кнопки).
- Инлайн `style={{}}` только для динамических значений (отступы с `insets`, `tabBarHeight`).
- Магические числа в отступах — выносить в `constants/layout.ts`.

### Компоненты
- Кнопки — только через `<Button variant='primary|secondary|danger|success' />`.
- Пустые состояния — через `<EmptyState icon='...' title='...' subtitle='...' />`.
- Иконки — через `<IconSymbol name='...' />` (SF Symbols → Material иконки маппинг в `IconSymbol.tsx`).

### Хуки и состояние
- `useFocusEffect` + `useCallback` для загрузки данных при фокусе экрана.
- Все функции внутри компонентов, используемые в `useEffect`/`useFocusEffect` — оборачивать в `useCallback` с правильными зависимостями.
- Дорогие вычисления в рендере — `useMemo`.

### База данных
- Все запросы — параметризованные (`?`), никакой интерполяции строк.
- Типизировать запросы через `CardRow` (сырая строка БД), а не `any`.
- Маппинг `CardRow → TCard` — только через `CardModel.withExamples()` (приватный метод).
- N+1 запросов избегать: загружать связанные данные одним запросом с группировкой в Map.

### Обработка ошибок
- `try/catch` в async-функциях, которые вызываются из UI.
- Ошибки инициализации — показывать пользователю, не глотать.
- `ErrorBoundary` уже обёрнут на уровне `_layout.tsx`.

### UX
- Экраны с загрузкой данных из БД — показывать `ActivityIndicator` пока `loading === true`.
- Пустой список/отсутствие карточки — показывать `EmptyState`.
- Ключевые действия (правильный/неправильный ответ, навигация) — `expo-haptics`.
- Горизонтальные списки фильтров/тегов — `<ScrollView horizontal style={{ flexGrow: 0 }}>`.

### Константы рейтинга
- Рейтинг карточки: `0` (Не знаю), `1` (Плохо), `2` (Хорошо).
- Всегда использовать `CardModel.clampRating()` при изменении рейтинга.

---

## Важные оговорки

- `useBottomTabBarHeight()` работает только внутри компонентов, которые рендерятся в контексте Bottom Tab Navigator. В `app/edit.tsx` (Stack-экран) этот хук использовать нельзя.
- `(tabs)/` — прозрачная группа для роутинга, `href: null` не нужен для скрытия экранов из таб-бара; вместо этого просто не регистрируй `Tabs.Screen`.
- AsyncStorage используется только для `currentLanguageId` и `currentDictionaryId`. Для остальных настроек — тоже AsyncStorage, ключи добавлять в `AppContext.tsx`.
