# AGENTS.md — Инструкция для ИИ-агентов

## Навигация по кодовой базе

```
app/_layout.tsx             ← корневой Stack (headerShown: false)
app/(tabs)/_layout.tsx      ← Bottom Tabs навигация
app/(tabs)/index.tsx        ← вкладка Список (рендерит CardListScreen)
app/(tabs)/card.tsx         ← вкладка Карточка (рендерит MainCardScreen)
app/(tabs)/add.tsx          ← вкладка Добавить
app/(tabs)/library.tsx      ← вкладка Библиотека
app/(tabs)/csv.tsx          ← вкладка CSV
app/(tabs)/quiz.tsx         ← вкладка Квиз
app/(tabs)/repeat.tsx       ← вкладка Повтор
app/edit.tsx                ← Stack-экран (БЕЗ таб-бара)

components/card/            ← FlipCard, FlipCardNavigator, FrontCard, BackCard, Card
components/ui/              ← Button, Input, EmptyState, Toast, ConfirmDialog, IconSymbol, RatingProgress
constants/layout.ts         ← FLOATING_PANEL_GAP, CONTENT_BOTTOM_PADDING, QUIZ_CONTENT_BOTTOM_PADDING
constants/quiz.ts           ← QUIZ_MIN_CARDS, QUIZ_TOTAL_OPTIONS, QUIZ_WRONG_OPTIONS
constants/theme.ts          ← цвета (hex-значения)
context/AppContext.tsx      ← currentLanguageId, currentDictionaryId, isReady + сеттеры
database/database.ts        ← initDatabase(), getDB()
models/CardModel.ts         ← все операции с карточками
models/DictionaryModel.ts   ← операции со словарями
models/LanguageModel.ts     ← операции с языками
screens/CardListScreen.tsx  ← тяжёлый компонент списка карточек
screens/MainCardScreen.tsx  ← тяжёлый компонент просмотра карточки
types/TCard.ts              ← TCard, TExample, CardRow
```

**Как найти функционал:**

- Запросы к БД → только в `models/`
- Глобальное состояние (язык/словарь) → `context/AppContext.tsx`
- Инициализация и миграции → `database/database.ts`
- Типы сырых строк БД → `types/TCard.ts` (`CardRow`)
- Константы UI → `constants/layout.ts`, `constants/quiz.ts`

---

## Стек и окружение

- **React Native 0.81.5** / **Expo 54** / **Expo Router v6** / **NativeWind v4** / **expo-sqlite v16** / **TypeScript**
- **expo-haptics** — установлен, использовать на ключевых действиях
- AsyncStorage — только для `currentLanguageId` и `currentDictionaryId` (через AppContext)

```bash
npx expo start          # дев-сервер
npx expo start --ios    # iOS симулятор
npx tsc --noEmit        # проверка типов
```

---

## Архитектурные правила — НЕЛЬЗЯ нарушать

1. **Весь SQL — только через модели.** `getDB()` нельзя вызывать в экранах и компонентах напрямую.
2. **Стили — только NativeWind `className`.** Инлайн `style={{}}` допустим только для динамических значений (`insets`, `tabBarHeight`).
3. **Кнопки — только `<Button variant='primary|secondary|danger|success' />`.** Нативный RN `<Button>` не использовать.
4. **Маппинг `CardRow → TCard`** — только через методы `CardModel`. Никакого ручного маппинга вне модели.
5. **`useBottomTabBarHeight()`** — только в `app/(tabs)/` контексте. В `app/edit.tsx` (Stack) этот хук недоступен.
6. **Параметризованные запросы — всегда.** Интерполяция строк в SQL запрещена.
7. **Рейтинг** — изменять только через `CardModel.clampRating()` или `CardModel.updateRatingAfterAnswer()`.
8. **Новые константы отступов** → `constants/layout.ts`. Магические числа в JSX — запрещены.

---

## Паттерны базы данных

### Правильный запрос через модель

```typescript
// Правильно — через модели
const cards = await CardModel.all(20, 0, dictionaryId);
const card = await CardModel.findById(id);
await CardModel.updateRatingAfterAnswer(cardId, isCorrect);

// Неправильно — getDB() в экране
const db = getDB();
await db.getAllAsync<any>("SELECT * FROM cards", []);
```

### Избегать N+1: JOIN + Map вместо Promise.all

```typescript
// Правильно — 2 запроса + Map:
const cards = await db.getAllAsync<CardRow>(
  "SELECT * FROM cards WHERE dictionary_id = ?",
  [dictionaryId],
);
const exRows = await db.getAllAsync<TExample & { card_id: number }>(
  "SELECT id, card_id, sentence FROM examples WHERE card_id IN (SELECT id FROM cards WHERE dictionary_id = ?)",
  [dictionaryId],
);
const byCardId = new Map<number, TExample[]>();
for (const ex of exRows) {
  const list = byCardId.get(ex.card_id) ?? [];
  list.push({ id: ex.id, sentence: ex.sentence });
  byCardId.set(ex.card_id, list);
}
return cards.map((c) => ({
  ...c,
  dictionaryId: c.dictionary_id,
  examples: byCardId.get(c.id) ?? [],
  show: false,
}));

// Неправильно — N+1 (1 запрос на каждую карточку):
const withExamples = await Promise.all(
  rows.map(async (row) => {
    const exRows = await db.getAllAsync(
      "SELECT sentence FROM examples WHERE card_id = ?",
      [row.id],
    );
    return { ...row, examples: exRows.map((e) => e.sentence) };
  }),
);
```

### ORDER BY RANDOM() — всегда с LIMIT

```sql
-- Правильно:
SELECT * FROM cards WHERE dictionary_id = ? ORDER BY RANDOM() LIMIT 50

-- Неправильно — полный скан при 10k+ строках:
SELECT * FROM cards WHERE dictionary_id = ? ORDER BY RANDOM()
```

### Типизация запросов

```typescript
// Правильно — CardRow для сырых строк
const result = await db.getFirstAsync<CardRow>(
  "SELECT * FROM cards WHERE id = ?",
  [id],
);

// Неправильно — any запрещён в этом проекте
const result = await db.getFirstAsync<any>("...");
```

---

## Паттерны компонентов

### Загрузка данных: useFocusEffect + useCallback + refreshKey

```typescript
// Паттерн для экранов, которые нужно перезагружать при возврате (из edit и т.д.)
const [focusCount, setFocusCount] = useState(0);
const [cards, setCards] = useState<TCard[]>([]);
const [loading, setLoading] = useState(true);

const load = useCallback(async () => {
  if (!currentDictionaryId) return;
  setLoading(true);
  const data = await CardModel.all(20, 0, currentDictionaryId);
  setCards(data);
  setLoading(false);
}, [currentDictionaryId]);

// useFocusEffect только инкрементирует счётчик — не вызывает load напрямую
useFocusEffect(
  useCallback(() => {
    setFocusCount((c) => c + 1);
  }, []),
);

// useEffect реагирует на focusCount + изменение зависимостей
useEffect(() => {
  if (focusCount === 0) return; // ждём первого фокуса
  load();
}, [focusCount, load]);
```

### Шаблон экрана: loading + empty state

```typescript
if (loading) {
  return (
    <View className='flex-1 items-center justify-center bg-primary-900'>
      <ActivityIndicator size='large' color='#4a98f0' />
    </View>
  );
}

if (cards.length === 0) {
  return (
    <EmptyState
      icon='rectangle.on.rectangle'
      title='Нет карточек'
      subtitle='Добавьте первую карточку на вкладке «+»'
    />
  );
}
```

### SafeArea и tabBarHeight

```typescript
// В (tabs) экранах — оба хука доступны:
const insets = useSafeAreaInsets();
const tabBarHeight = useBottomTabBarHeight();

<View
  className='flex-1 bg-primary-900'
  style={{ paddingBottom: tabBarHeight + insets.bottom + FLOATING_PANEL_GAP }}
>

// В app/edit.tsx (Stack) — только insets, useBottomTabBarHeight недоступен:
const insets = useSafeAreaInsets();
<View style={{ paddingBottom: insets.bottom + 16 }}>
```

### Адаптивные размеры через useWindowDimensions

```typescript
import { useWindowDimensions } from "react-native";

const { width, height } = useWindowDimensions();
const cardMinHeight = Math.max(180, height * 0.28);
const isTablet = width >= 768;
```

### Горизонтальный список фильтров

```typescript
<ScrollView horizontal style={{ flexGrow: 0 }} showsHorizontalScrollIndicator={false}>
  {filters.map(f => <FilterChip key={f.id} {...f} />)}
</ScrollView>
```

---

## Паттерны состояния

```typescript
// useCallback — полные зависимости обязательны
const handleDelete = useCallback(async (id: number) => {
  await CardModel.delete(id);
  setCards((prev) => prev.filter((c) => c.id !== id));
}, []); // [] допустим, если нет внешних зависимостей

// useMemo — для дорогих вычислений
const filteredCards = useMemo(
  () => cards.filter((c) => !hiddenRatings.has(c.rating ?? 0)),
  [cards, hiddenRatings],
);

// React.memo — для компонентов в списках
export default React.memo(CardListItem);
```

---

## Цветовая палитра

| Класс NativeWind     | Hex       | Назначение                 |
| -------------------- | --------- | -------------------------- |
| `bg-primary-900`     | `#101b2b` | Фон экранов                |
| `bg-primary-800`     | `#18263a` | Карточки, поверхности      |
| `bg-primary-300`     | `#2d4464` | Поля ввода, бордеры        |
| `border-primary-200` | `#223550` | Бордеры                    |
| `text-primary-100`   | `#d6e2f3` | Основной текст             |
| `bg-accent-600`      | `#4a98f0` | Акцент, кнопки             |
| `text-accent-500`    | `#58a6ff` | Акцентный текст (переводы) |
| —                    | `#22c55e` | Успех (success)            |
| —                    | `#ef4444` | Ошибка (danger)            |
| —                    | `#15253b` | Таб-бар                    |

Рейтинг: `0` = Не знаю, `1` = Плохо, `2` = Хорошо.

---

## Типичные ошибки (антипаттерны с примерами)

### 1. getDB() в экране вместо модели

```typescript
// НЕПРАВИЛЬНО:
const db = getDB();
await db.runAsync("UPDATE cards SET rating = ? WHERE id = ?", [newRating, id]);

// ПРАВИЛЬНО:
await CardModel.updateRatingAfterAnswer(id, isCorrect);
```

### 2. N+1 запросов

```typescript
// НЕПРАВИЛЬНО
await Promise.all(
  rows.map(async (row) => {
    const exRows = await db.getAllAsync(
      "SELECT sentence FROM examples WHERE card_id = ?",
      [row.id],
    );
    return { ...row, examples: exRows.map((e) => e.sentence) };
  }),
);

// ПРАВИЛЬНО — использовать CardModel.getRepeatPool(dictionaryId)
```

### 3. ORDER BY RANDOM() без LIMIT

```typescript
// НЕПРАВИЛЬНО
"SELECT * FROM cards WHERE dictionary_id = ? ORDER BY RANDOM()";

// ПРАВИЛЬНО:
"SELECT * FROM cards WHERE dictionary_id = ? ORDER BY RANDOM() LIMIT 50";
```

### 4. Фиксированные размеры без адаптации

```typescript
// НЕПРАВИЛЬНО:
<View style={{ minHeight: 220, maxHeight: 160 }}>

// ПРАВИЛЬНО:
const { height } = useWindowDimensions();
<View style={{ minHeight: Math.max(180, height * 0.28) }}>
```

### 5. Двойная загрузка в useFocusEffect + useEffect

```typescript
// НЕПРАВИЛЬНО — оба срабатывают при монтировании:
useFocusEffect(
  useCallback(() => {
    loadData();
  }, [loadData]),
);
useEffect(() => {
  loadData();
}, [loadData]);

// ПРАВИЛЬНО — refreshKey паттерн (см. выше)
```

### 6. Hardcoded цвета вместо темы

```typescript
// НЕПРАВИЛЬНО:
{ backgroundColor: '#166534', borderColor: '#22c55e' }

// ПРАВИЛЬНО — выносить в именованные константы или theme:
const OPTION_COLORS = {
  correct: { backgroundColor: '#166534', borderColor: '#22c55e' },
  wrong:   { backgroundColor: '#991b1b', borderColor: '#ef4444' },
  neutral: { backgroundColor: '#0e1c1c', borderColor: '#1e4747' },
} as const;
```

### 7. useBottomTabBarHeight в Stack-экране

```typescript
// НЕПРАВИЛЬНО — app/edit.tsx — Stack не имеет Bottom Tabs:
const tabBarHeight = useBottomTabBarHeight(); // throws или 0

// ПРАВИЛЬНО — только SafeArea:
const insets = useSafeAreaInsets();
```

### 8. Магические числа в отступах

```typescript
// НЕПРАВИЛЬНО:
style={{ paddingBottom: tabBarHeight + 156 }}

// ПРАВИЛЬНО — константа в constants/layout.ts:
import { QUIZ_CONTENT_BOTTOM_PADDING } from '@/constants/layout';
style={{ paddingBottom: tabBarHeight + QUIZ_CONTENT_BOTTOM_PADDING }}
```

---

## Чеклист перед отправкой изменений

- [ ] Нет прямых `getDB()` вызовов в экранах и компонентах
- [ ] Нет SQL-интерполяции строк (только параметры `?`)
- [ ] `ORDER BY RANDOM()` всегда с `LIMIT`
- [ ] Все async функции в `useEffect`/`useFocusEffect` — в `useCallback` с зависимостями
- [ ] Фиксированные размеры → `useWindowDimensions`
- [ ] Загрузка → `ActivityIndicator` пока `loading === true`
- [ ] Пустой список → `<EmptyState />` компонент
- [ ] Кнопки → `<Button variant='...' />`
- [ ] Ключевые действия → `expo-haptics`
- [ ] Рейтинг → `CardModel.clampRating()` или `CardModel.updateRatingAfterAnswer()`
- [ ] Новые числа отступов → `constants/layout.ts`
