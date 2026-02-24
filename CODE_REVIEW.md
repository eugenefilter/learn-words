# Code Review — VocabCardsApp (актуальный)

> Дата ревью: 2026-02-24
> Стек: React Native 0.81.5 / Expo 54 / Expo Router v6 / NativeWind v4 / expo-sqlite v16
> Предыдущее ревью (2026-02-19) — в разделе ниже. Многие старые баги исправлены.

---

## Содержание (текущее ревью)

1. [Критические ошибки и баги](#1-критические-ошибки-и-баги)
2. [Производительность и оптимизация](#2-производительность-и-оптимизация)
3. [Качество кода](#3-качество-кода)
4. [Адаптивность под устройства](#4-адаптивность-под-устройства)
5. [Современные подходы](#5-современные-подходы)
6. [Архитектурные рекомендации](#6-архитектурные-рекомендации)
7. [Таблица приоритетов](#7-таблица-приоритетов)

---

## 1. Критические ошибки и баги

### 1.1 N+1 запросов в `repeat.tsx` (строки 50–58)

```ts
// repeat.tsx:50-58 — ПЛОХО
const withExamples = await Promise.all(
  rows.map(async (row) => {
    const exRows = await db.getAllAsync<{ sentence: string }>(
      'SELECT sentence FROM examples WHERE card_id = ?', [row.id]
    );
    return { ...row, examples: exRows.map((e) => e.sentence) };
  })
);
```

При 100 карточках — 101 запрос к БД. В `CardModel` уже есть правильный паттерн через `Map` (`allWithExamplesByDictionary`). Нужно добавить `CardModel.getRepeatPool()` с JOIN/GROUP_CONCAT.

**Исправление:**
```sql
SELECT c.id, c.word, c.translation, c.transcription, c.rating,
       GROUP_CONCAT(e.sentence, '||') AS examples_raw
FROM cards c
LEFT JOIN examples e ON e.card_id = c.id
WHERE c.dictionary_id = ? AND c.rating < 2
GROUP BY c.id
ORDER BY c.rating ASC, RANDOM()
```

---

### 1.2 Прямой SQL вне модели в `repeat.tsx` (строка 90)

```ts
// repeat.tsx:90 — нарушение архитектуры
await getDB().runAsync('UPDATE cards SET rating = ? WHERE id = ?', [newRating, card.id]);
```

`CardModel.updateRatingAfterAnswer()` уже существует — делает то же самое с транзакцией и проверкой текущего рейтинга из БД. Замена:
```ts
await CardModel.updateRatingAfterAnswer(card.id, delta > 0);
```

---

### 1.3 Карточки с rating=2 остаются на экране в `repeat.tsx` (строки 92–94)

После ответа "Знаю" на карточку с rating=1 она получает rating=2, но **остаётся в массиве `cards`** — пользователь продолжит её видеть до перезагрузки. Это противоречит заголовку экрана: "Карточки с «Не знаю» и «Плохо»".

```ts
// repeat.tsx:92-94 — карточка с rating=2 не фильтруется
setCards((prev) =>
  prev.map((c) => (c.id === card.id ? { ...c, rating: newRating } : c))
);
```

**Исправление:**
```ts
setCards((prev) =>
  prev
    .map((c) => (c.id === card.id ? { ...c, rating: newRating } : c))
    .filter((c) => c.rating < 2)  // убрать "выпускников"
);
```

---

### 1.4 `getQuizPool` загружает ВСЕ карточки без LIMIT (`CardModel.ts:155`)

```ts
// CardModel.ts:155 — опасно при большом словаре
const rows = await db.getAllAsync<CardRow>(
  'SELECT * FROM cards WHERE dictionary_id = ? ORDER BY RANDOM()',
  [dictionaryId]
);
```

`ORDER BY RANDOM()` без `LIMIT` на 10 000+ строках — SQLite перебирает весь индекс. При больших словарях это подвесит UI на несколько секунд.

**Исправление:**
```sql
SELECT * FROM cards WHERE dictionary_id = ? ORDER BY RANDOM() LIMIT 50
```

---

### 1.5 Двойная загрузка данных в `CardListScreen.tsx` (строки 126–135)

```ts
// CardListScreen.tsx:126-135
useFocusEffect(
  useCallback(() => {
    loadContext();
    loadFirstPage(debouncedSearch); // вызов #1
  }, [loadContext, loadFirstPage, debouncedSearch])
)

useEffect(() => {
  loadFirstPage(debouncedSearch); // вызов #2 — одновременно с #1 при монтировании
}, [debouncedSearch, loadFirstPage])
```

При первом рендере оба хука стреляют одновременно — два параллельных запроса к БД. Защита через `requestIdRef` работает, но создаёт лишнюю нагрузку. `useFocusEffect` должен покрывать возврат к экрану, `useEffect` — смену поискового запроса.

---

### 1.6 Race condition в `AppContext.tsx` — нет флага `isReady`

`currentLanguageId` и `currentDictionaryId` инициализируются как `null`, компоненты уже рендерятся до завершения инициализации из AsyncStorage. В `_layout.tsx` есть `dbInitialized`, но `AppContext` не имеет аналогичной защиты:

```ts
// AppContext.tsx — нет loading-состояния
const [currentLanguageId, setCurrentLanguageIdState] = useState<number | null>(null);
// дети рендерятся немедленно с null
```

---

### 1.7 `setCurrentDictionaryId` в AsyncStorage без обработки ошибок (`AppContext.tsx:57`)

```ts
const setCurrentDictionaryId = useCallback((id: number) => {
  setCurrentDictionaryIdState(id);
  AsyncStorage.setItem(STORAGE_KEY_DICTIONARY, String(id)); // без await/catch
}, []);
```

При ошибке записи (переполнение хранилища, сбой) данные не сохранятся. При следующем запуске пользователь потеряет выбранный словарь.

---

### 1.8 Мёртвый стиль `cardBack` в `FlipCard.tsx` (строка 109)

```ts
const styles = StyleSheet.create({
  card: { backfaceVisibility: 'hidden' },
  cardBack: { backgroundColor: '#E7E0EC' }, // нигде не используется — мёртвый код
});
```

---

## 2. Производительность и оптимизация

### 2.1 Фильтрация и сортировка на стороне JS вместо SQL (`CardListScreen.tsx:40–53`)

```ts
const applyFilters = useCallback((list: TCard[]) => {
  let result = list;
  if (hiddenRatings.size > 0) {
    result = result.filter(c => !hiddenRatings.has(c.rating ?? 0)); // JS-фильтрация
  }
  if (sortMode !== 'none') {
    result = [...result].sort(...); // JS-сортировка
  }
  setVisibleCards(result);
}, [hiddenRatings, sortMode]);
```

**Проблема:** пагинация идёт по нефильтрованным данным из БД. При скрытии рейтинга 0 из 20 загруженных карточек отобразится, например, 5. Но `hasMore` всё равно останется `true`, и `loadMoreCards` продолжит запрашивать данные, которые потом отфильтруются. Правильно — передавать фильтры прямо в SQL запрос.

### 2.2 `Animated` API вместо `react-native-reanimated` в `FlipCard`

`Animated.timing` работает на JS-потоке. `react-native-reanimated` (уже есть в Expo) работает на UI-потоке — 60/120fps без блокировок. Особенно критично при активных свайпах.

```ts
// FlipCard.tsx:22-35 — Animated на JS потоке
Animated.timing(animatedValue, {
  toValue: 0, duration: 300, useNativeDriver: true,
}).start(() => setFlipped(false));
```

### 2.3 `PanResponder` вместо `react-native-gesture-handler`

`PanResponder` — устаревший API, работает на JS-потоке и конфликтует с системными жестами (navigation swipe back на iOS). `react-native-gesture-handler` (уже установлен в Expo) обрабатывает жесты нативно.

### 2.4 `React.memo` применён непоследовательно

- `Card` — мемоизирован ✅
- `FrontCard`, `BackCard`, `EmptyState`, `Button`, `RatingProgress` — не мемоизированы ❌

`Button` и `RatingProgress` рендерятся многократно внутри списков — кандидаты на `React.memo`.

### 2.5 `SELECT *` во всех запросах `CardModel`

```ts
// CardModel.ts — везде SELECT *
'SELECT * FROM cards WHERE ...'
```

`SELECT *` возвращает поле `explanation` (потенциально длинный текст) там, где оно не нужно (список, навигация). Явный выбор полей снижает объём передаваемых данных.

### 2.6 Предзагрузка опций для следующей карточки в Quiz отсутствует

`buildOptionsForCard` вызывается при переходе к следующей карточке — пользователь видит задержку. Можно предзагружать опции для n+1 карточки в фоне сразу после ответа на текущую.

### 2.7 Индекс на `rating` отсутствует

`WHERE rating < 2` (repeat), `ORDER BY rating` (список) — частые запросы без индекса:

```sql
-- database.ts — добавить
CREATE INDEX IF NOT EXISTS idx_cards_rating ON cards(dictionary_id, rating);
```

### 2.8 `hardcoded` число вариантов ответа Quiz

```ts
// quiz.tsx:158 — magic number
if (!currentCard || options.length !== 5) return;
// quiz.tsx:88
if (fullWrong.length < 4 || !correct) { ... }
```

Число `5` = 1 правильный + 4 неправильных — нигде не определено как константа.

---

## 3. Качество кода

### 3.1 `repeat.tsx` нарушает архитектуру проекта

Файл содержит прямые SQL-запросы через `getDB()`, тогда как по всему проекту запросы инкапсулированы в моделях. Нужно добавить в `CardModel`:
- `CardModel.getRepeatPool(dictionaryId)` — загрузка + примеры за один запрос
- `CardModel.updateRating(cardId, newRating)` — прямое обновление (не через delta answer)

### 3.2 Hardcoded цвета в `quiz.tsx` не попадают в тему (`строки 181–192`)

```ts
const neutral = { backgroundColor: '#0e1c1c', borderColor: '#1e4747' };
// correct:
{ backgroundColor: '#166534', borderColor: '#22c55e' }
// wrong:
{ backgroundColor: '#991b1b', borderColor: '#ef4444' }
```

Эти цвета не объявлены ни в `tailwind.config.js`, ни в `constants/theme.ts`. При смене темы придётся менять вручную.

### 3.3 Поле `show?: boolean` в типе `TCard` — UI-состояние в модели данных

```ts
// types/TCard.ts
type TCard = { ..., show?: boolean }
```

`show` — флаг отображения карточки в UI. Он не имеет отношения к модели данных и должен храниться в локальном `useState` компонента.

### 3.4 Устаревший файл `database/databaseSync.ts`

Файл не импортируется нигде в проекте. Мёртвый код — удалить.

### 3.5 `loadContext` в `CardListScreen` — потенциальный бесконечный цикл

```ts
const loadContext = useCallback(async () => {
  // ...
  if (!currentDictionaryId && d[0]?.id) setCurrentDictionaryId(d[0].id);
}, [currentLanguageId, currentDictionaryId, setCurrentLanguageId, setCurrentDictionaryId]);
```

`loadContext` меняется при изменении `currentDictionaryId`. Это обновляет `useFocusEffect`, который снова вызывает `loadContext`. При определённых условиях — цикл.

### 3.6 `CardModel.delete` — избыточное ручное удаление примеров

```ts
// CardModel.ts:85-88
await db.runAsync('DELETE FROM examples WHERE card_id = ?', [id]); // избыточно
await db.runAsync('DELETE FROM cards WHERE id = ?', [id]);
```

В `database.ts` таблица `examples` объявлена с `ON DELETE CASCADE`. Явное удаление примеров не нужно.

### 3.7 Непоследовательный стиль кода

- Часть методов `CardModel.ts` заканчиваются без `;` (строки 218, 228)
- В разных файлах смесь `const Component = () =>` и `function Component()`
- Рекомендуется настроить Prettier с `semi: true` и зафиксировать стиль объявления компонентов

---

## 4. Адаптивность под устройства

### 4.1 Hardcoded высота таб-бара `62px` (`_layout.tsx`)

```ts
tabBarStyle: { height: 62 }
```

На iPad, iPhone SE, устройствах с крупными системными шрифтами высота должна быть другой. Нужно либо вычислять динамически, либо использовать значения из `useSafeAreaInsets()`.

### 4.2 Фиксированные размеры карточки в `repeat.tsx`

```ts
style={{ minHeight: 220 }}  // строка 138 — слишком много на iPhone SE
style={{ maxHeight: 160 }}  // строка 164 — мало для планшетов
```

**Решение:**
```ts
const { height } = useWindowDimensions();
const cardMinHeight = height * 0.28; // ~28% высоты экрана
```

### 4.3 `HEADER_HEIGHT = 64` не учитывает SafeArea (`CardListScreen.tsx:17`)

```ts
const HEADER_HEIGHT = 64
```

На iPhone 14 Pro+ с Dynamic Island `insets.top` равен 59px. Хедер перекрывает контент. Нужно:
```ts
const insets = useSafeAreaInsets();
const headerHeight = 64 + insets.top;
```

### 4.4 Нет поддержки планшетов (iPad)

Весь интерфейс однодолонный. На iPad 12.9" нет:
- Многоколоночной раскладки для списка карточек
- Адаптивных отступов
- Использования `useWindowDimensions` для брейкпойнтов

Минимальный шаг:
```ts
const { width } = useWindowDimensions();
const isTablet = width >= 768;
const numColumns = isTablet ? 2 : 1;
```

### 4.5 Нет поддержки Landscape-ориентации

При повороте устройства фиксированные высоты ломают верстку. Необходимо:
- Явно заблокировать ориентацию в `app.json`: `"orientation": "portrait"`, или
- Добавить адаптацию через `useWindowDimensions` и `useFocusEffect`

### 4.6 Нет `accessibilityLabel` на иконках-кнопках

```tsx
// FrontCard.tsx — кнопка без описания для VoiceOver/TalkBack
<Pressable onPress={onEdit}>
  <IconSymbol name='pencil' size={20} />
</Pressable>
```

**Исправление:**
```tsx
<Pressable
  onPress={onEdit}
  accessibilityLabel="Редактировать карточку"
  accessibilityRole="button"
  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
>
```

### 4.7 Нет `hitSlop` на маленьких иконках

Apple HIG рекомендует зону касания минимум 44×44pt. Иконки 18–20px без `hitSlop` неудобны на реальных устройствах. Добавить ко всем иконкам-кнопкам.

### 4.8 Dynamic Type (iOS) не поддерживается

Приложение использует фиксированные классы (`text-4xl`, `text-2xl`). Проверить, что нигде не выставлен `allowFontScaling={false}` — это ломает системную настройку размера шрифта для слабовидящих.

---

## 5. Современные подходы

### 5.1 `react-native-reanimated` v3 для анимаций

```ts
// Вместо Animated (JS-поток):
import Animated, {
  useSharedValue, withTiming, interpolate, useAnimatedStyle
} from 'react-native-reanimated';

const rotation = useSharedValue(0);
const animatedStyle = useAnimatedStyle(() => ({
  transform: [{ rotateY: `${rotation.value}deg` }],
}));
// Работает на UI-потоке — 60/120fps без janky-эффекта
```

### 5.2 Версионированные миграции через `PRAGMA user_version`

```ts
// Вместо try-catch ALTER TABLE без версий:
const { user_version } = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');

if (user_version < 2) {
  await db.execAsync('ALTER TABLE cards ADD COLUMN explanation TEXT');
}
if (user_version < 3) {
  await db.execAsync('CREATE INDEX IF NOT EXISTS idx_cards_rating ON cards(dictionary_id, rating)');
}
await db.execAsync(`PRAGMA user_version = 3`);
```

### 5.3 Кастомный хук `useLayoutInsets()`

Паттерн `(tabBarHeight || 0) + insets.bottom + N` повторяется в каждом экране:

```ts
// hooks/useLayoutInsets.ts
export function useLayoutInsets(extraBottom = 0) {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  return {
    contentPaddingBottom: tabBarHeight + insets.bottom + extraBottom,
    headerPaddingTop: insets.top,
  };
}
```

### 5.4 Zustand для глобального состояния

```ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

const useAppStore = create(
  persist(
    (set) => ({
      currentLanguageId: null as number | null,
      currentDictionaryId: null as number | null,
      setCurrentLanguageId: (id: number) => set({ currentLanguageId: id }),
      setCurrentDictionaryId: (id: number) => set({ currentDictionaryId: id }),
    }),
    { name: 'app-storage', storage: createJSONStorage(() => AsyncStorage) }
  )
);
```

Автоматическая персистентность без ручного `AsyncStorage.setItem`. Нет лишних ре-рендеров у компонентов, которые не подписаны на изменившееся поле.

### 5.5 Кастомные хуки для бизнес-логики экранов

```ts
// hooks/useRepeatCards.ts
export function useRepeatCards(dictionaryId: number | null) {
  const [cards, setCards] = useState<RepeatCard[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!dictionaryId) { setCards([]); setLoading(false); return; }
    setLoading(true);
    const data = await CardModel.getRepeatPool(dictionaryId);
    setCards(data);
    setLoading(false);
  }, [dictionaryId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return { cards, loading, reload: load };
}
```

### 5.6 Zod-валидация форм

```ts
import { z } from 'zod';

const CardSchema = z.object({
  word: z.string().min(1, 'Слово обязательно'),
  translation: z.string().min(1, 'Перевод обязателен'),
  transcription: z.string().optional(),
  examples: z.array(z.string().min(1)).max(10),
});
```

### 5.7 CSV-утилиты вынести из экранов

`csv.tsx` и `library.tsx` содержат дублирующийся CSV-парсер. Создать:
```
utils/csv.ts
  parseCSV(text: string, delimiter?: string): CSVRow[]
  generateCSV(cards: TCard[]): string
  detectDelimiter(firstLine: string): string
```

### 5.8 Тесты

Jest настроен, но ни одного теста нет. Первоочередные кандидаты:

| Что тестировать | Почему |
|---|---|
| `CardModel.clampRating()` | Граничные значения 0/1/2, отрицательные, дробные |
| `CardModel.nextRatingByAnswer()` | Логика инкремента/декремента |
| CSV-парсер | Много edge cases: кавычки, BOM, разделители, пустые поля |
| `AppContext` init | Порядок загрузки из AsyncStorage |

---

## 6. Архитектурные рекомендации

### 6.1 Добавить `CardModel.getRepeatPool()` и убрать прямой SQL из `repeat.tsx`

```ts
// models/CardModel.ts
static async getRepeatPool(dictionaryId: number): Promise<RepeatCard[]> {
  const db = getDB();
  const rows = await db.getAllAsync<CardRow & { examples_raw: string | null }>(
    `SELECT c.id, c.word, c.translation, c.transcription, c.rating,
            GROUP_CONCAT(e.sentence, '||') AS examples_raw
     FROM cards c
     LEFT JOIN examples e ON e.card_id = c.id
     WHERE c.dictionary_id = ? AND c.rating < 2
     GROUP BY c.id
     ORDER BY c.rating ASC, RANDOM()`,
    [dictionaryId]
  );
  return rows.map(r => ({
    ...r,
    examples: r.examples_raw ? r.examples_raw.split('||').filter(Boolean) : [],
  }));
}
```

### 6.2 `ErrorBoundary` на уровне каждого таба

Текущий `ErrorBoundary` в `_layout.tsx` ловит ошибки всего приложения. Ошибка в одном табе роняет всё:

```ts
// app/(tabs)/_layout.tsx
<Tabs.Screen name="quiz" component={() => (
  <ErrorBoundary fallback={<ErrorScreen />}>
    <QuizScreen />
  </ErrorBoundary>
)} />
```

### 6.3 Разбить `LibraryScreen` на подкомпоненты

`library.tsx` — монолитный файл с управлением языками, словарями, CSV-импортом и четырьмя модалами. Предлагаемое разбиение:
```
screens/library/
  LibraryScreen.tsx
  LanguageList.tsx
  DictionaryList.tsx
  LanguageFormModal.tsx
  DictionaryFormModal.tsx
```

### 6.4 Константы для Quiz

```ts
// constants/quiz.ts
export const QUIZ_MIN_CARDS = 5;
export const QUIZ_WRONG_OPTIONS = 4;
export const QUIZ_TOTAL_OPTIONS = QUIZ_WRONG_OPTIONS + 1; // 5
```

### 6.5 Добавить индекс на rating

```sql
-- database.ts — добавить в initDatabase()
CREATE INDEX IF NOT EXISTS idx_cards_dict_rating
  ON cards(dictionary_id, rating);
```

---

## 7. Таблица приоритетов

| Статус | Приоритет | Проблема | Файл |
|--------|-----------|----------|------|
| ✅ | 🔴 Критично | N+1 запросов → `CardModel.getRepeatPool()` с JOIN | `repeat.tsx` |
| ✅ | 🔴 Критично | Прямой SQL → `CardModel.updateRatingAfterAnswer()` | `repeat.tsx` |
| ✅ | 🔴 Критично | Карточки rating=2 фильтруются после ответа | `repeat.tsx` |
| ✅ | 🔴 Критично | `getQuizPool` + `LIMIT 50` | `CardModel.ts` |
| ✅ | 🟠 Важно | Двойная загрузка → `focusCount` паттерн | `CardListScreen.tsx` |
| ✅ | 🟠 Важно | HEADER_HEIGHT + `insets.top` для SafeArea | `CardListScreen.tsx` |
| ✅ | 🟠 Важно | `isReady` флаг + `ActivityIndicator` в AppContext | `AppContext.tsx` |
| ✅ | 🟠 Важно | AsyncStorage с `.catch()` | `AppContext.tsx` |
| ✅ | 🟠 Важно | Hardcoded цвета → `OPTION_COLORS` константа | `quiz.tsx` |
| ✅ | 🟠 Важно | Магические числа → `constants/quiz.ts` | `quiz.tsx` |
| ✅ | 🟡 Умеренно | Адаптивные размеры → `useWindowDimensions` | `repeat.tsx` |
| ✅ | 🟡 Умеренно | Мёртвый `cardBack` стиль удалён | `FlipCard.tsx` |
| ✅ | 🟡 Умеренно | `databaseSync.ts` удалён | `database/` |
| ✅ | 🟡 Умеренно | Избыточный `DELETE FROM examples` убран | `CardModel.ts` |
| ✅ | 🟢 Улучшение | Индекс `idx_cards_dict_rating` | `database.ts` |
| ✅ | 🟢 Улучшение | `AGENTS.md` — инструкция для агентов | `AGENTS.md` |
| ⏳ | 🟡 Умеренно | `show` поле в TCard — UI-состояние в модели | `types/TCard.ts` |
| ⏳ | 🟡 Умеренно | Фильтрация в JS вместо SQL | `CardListScreen.tsx` |
| ⏳ | 🟡 Умеренно | `accessibilityLabel` на иконках-кнопках | Все экраны |
| ⏳ | 🟡 Умеренно | `hitSlop` на маленьких иконках | Все экраны |
| ⏳ | 🟢 Улучшение | Animated → Reanimated | `FlipCard.tsx`, `Toast.tsx` |
| ⏳ | 🟢 Улучшение | PanResponder → GestureHandler | `FlipCard.tsx` |
| ⏳ | 🟢 Улучшение | Версионированные миграции `PRAGMA user_version` | `database.ts` |
| ⏳ | 🟢 Улучшение | Zustand вместо Context+AsyncStorage | `AppContext.tsx` |
| ⏳ | 🟢 Улучшение | Поддержка планшетов (iPad) | Все экраны |
| ⏳ | 🟢 Улучшение | Тесты CardModel + CSV-парсер | — |
| ⏳ | 🟢 Улучшение | CSV-утилиты → `utils/csv.ts` | `csv.tsx`, `library.tsx` |

---

---

# Code Review (предыдущее — 2026-02-19)

> Стек: React Native 0.76, Expo 52, Expo Router 4, NativeWind 4, expo-sqlite 15

---

## Содержание

1. [Критические баги](#1-критические-баги)
2. [Качество кода](#2-качество-кода)
3. [Производительность](#3-производительность)
4. [UI / UX](#4-ui--ux)
5. [Архитектура и структура](#5-архитектура-и-структура)
6. [Лучшие практики React Native](#6-лучшие-практики-react-native)
7. [Рекомендации по рефакторингу — приоритеты](#7-рекомендации-по-рефакторингу--приоритеты)

---

## 1. Критические баги

### 1.1 `repeat.tsx` — обращение к несуществующей колонке `level`

**Файл:** `app/(tabs)/repeat.tsx`

```tsx
// БАГИ:
// 1. Колонки `level` нет в схеме БД — есть `rating`
const result = await db.getAllAsync<Card>(
  "SELECT * FROM cards WHERE level <= 3",
);

// 2. Обновление несуществующей колонки
await db.runAsync("UPDATE cards SET level = ? WHERE id = ?", [
  newLevel,
  card.id,
]);
```

Экран `Repeat` полностью нерабочий: запрос всегда вернёт пустой массив, а UPDATE не изменит ничего, потому что колонки `level` в таблице `cards` нет. Нужно заменить на `rating`.

**Исправление:**

```tsx
// Правильный запрос — колонка называется `rating`
"SELECT * FROM cards WHERE rating <= 1";
// Обновление тоже через rating
"UPDATE cards SET rating = ? WHERE id = ?";
```

---

### 1.2 `FrontCard.tsx` — захардкоженный placeholder-текст в продакшн-коде

**Файл:** `components/card/FrontCard.tsx`, строка 47

```tsx
// БАГИ: это тестовый текст, который попал в прод
<Text className="text-primary-100 text-xl opacity-90 text-center">
  to limit yourself to doing or using one particular thing and not change to
  anything else
</Text>
```

Этот текст не связан ни с одним полем `card`. Скорее всего, это должно быть `card.explanation`, но сейчас отображается статичная строка. Поле `explanation` есть в схеме БД и в `TCard`, но нигде не выводится.

**Исправление:**

```tsx
{
  card.explanation ? (
    <Text className="text-primary-100 text-xl opacity-90 text-center">
      {card.explanation}
    </Text>
  ) : null;
}
```

---

### 1.3 SQL-инъекция в `database.ts`

**Файл:** `database/database.ts`, строка 88

```ts
// РИСК: строковая интерполяция в SQL
await db.execAsync(
  `UPDATE cards SET dictionary_id = ${dictId} WHERE dictionary_id IS NULL;`,
);
```

Переменная `dictId` получена из БД и является числом, поэтому прямой угрозы сейчас нет. Однако это плохой паттерн — нужно всегда использовать параметризованные запросы.

**Исправление:**

```ts
await db.runAsync(
  "UPDATE cards SET dictionary_id = ? WHERE dictionary_id IS NULL",
  [dictId],
);
```

---

## 2. Качество кода

### 2.1 `console.log` в продакшн-коде

Несколько `console.log` оставлены в коде и попадут в production-сборку.

| Файл                         | Строка | Содержимое           |
| ---------------------------- | ------ | -------------------- |
| `screens/CardListScreen.tsx` | 64     | `console.log(value)` |
| `screens/MainCardScreen.tsx` | 52     | `console.log(prev)`  |
| `screens/MainCardScreen.tsx` | 65     | `console.log(next)`  |

Все три нужно удалить. Для отладки в будущем используйте `__DEV__ && console.log(...)`.

---

### 2.2 Дублирующий импорт `ScrollView` в `CardListScreen`

**Файл:** `screens/CardListScreen.tsx`

```tsx
import { View, Text, Pressable } from "react-native"; // строка 4
import { FlatList } from "react-native"; // строка 5
// ...
import { ScrollView } from "react-native"; // строка 15 — дубль!
```

Нужно объединить в один импорт:

```tsx
import { View, Text, Pressable, FlatList, ScrollView } from "react-native";
```

---

### 2.3 Конфликт `paddingBottom` в `add.tsx`

**Файл:** `app/(tabs)/add.tsx`, строка 118

```tsx
// Padding задан дважды: через className И через inline style
<View
  className='flex-1 px-5 pt-6 pb-24'  // pb-24 = 96px
  style={{ paddingBottom: (tabBarHeight || 0) + insets.bottom + 96 }}  // ещё padding
>
```

NativeWind-класс `pb-24` переопределяется инлайн-стилем, но оба имеют одинаковое значение 96px. Это запутывает код. Нужно оставить только `style`.

---

### 2.4 Stale closure в `useFocusEffect` — `CardListScreen`

**Файл:** `screens/CardListScreen.tsx`, строки 85–90

```tsx
useFocusEffect(
  useCallback(() => {
    loadContext();
    loadCards();
  }, []), // ← пустой массив deps, но функции ссылаются на currentDictionaryId
);
```

`loadCards` и `loadContext` — обычные функции внутри компонента (не `useCallback`), поэтому они пересоздаются при каждом рендере. `useCallback(() => ..., [])` захватывает первую версию этих функций и не обновляется. Также `loadContext` вызывает `setCurrentLanguageId`/`setCurrentDictionaryId` внутри условий, что может приводить к лишним рендерам.

**Исправление:** обернуть `loadCards` и `loadContext` в `useCallback` с корректными зависимостями.

---

### 2.5 Missing dependency в `useEffect` — `MainCardScreen`

**Файл:** `screens/MainCardScreen.tsx`, строки 22–41

```tsx
useEffect(() => {
  const loadById = async () => {
    // ...
    const first = await CardModel.firstCard(currentDictionaryId || undefined);
    // ...
  };
  loadById();
}, [id]); // ← currentDictionaryId не в зависимостях!
```

При смене словаря карточка не перезагружается. Нужно добавить `currentDictionaryId` в deps.

---

### 2.6 Закомментированный мёртвый код

| Файл                           | Строки  | Описание                                       |
| ------------------------------ | ------- | ---------------------------------------------- |
| `models/CardModel.ts`          | 38–50   | Закомментированная загрузка примеров в `all()` |
| `components/card/FlipCard.tsx` | 107     | `// styles.cardBack`                           |
| `screens/CardListScreen.tsx`   | 143–148 | Закомментированная кнопка "Add Card"           |

Мёртвый код ухудшает читаемость. Если нужна история — используйте git.

---

### 2.7 `repeat.tsx` — несовместимый стиль с остальным приложением

**Файл:** `app/(tabs)/repeat.tsx`

- Использует нативный `Button` из React Native вместо кастомного `Button`
- Использует inline `style={{}}` вместо NativeWind
- Использует относительный импорт `'../../database/database'` вместо алиаса `@/`
- Не использует `AppContext` — не фильтрует по текущему словарю
- Не использует `useFocusEffect` для перезагрузки данных

Экран нужно полностью переписать в стиле остальных экранов.

---

### 2.8 Неиспользуемые переменные в `FlipCard.tsx`

**Файл:** `components/card/FlipCard.tsx`, строки 40–53

```tsx
const rotateY = animatedValue.interpolate(...)    // ← вычисляется, но не используется в JSX
const frontOpacity = animatedValue.interpolate(...) // ← вычисляется, но не используется
const backOpacity = animatedValue.interpolate(...)  // ← вычисляется, но не используется
```

Три `Animated.Value.interpolate()` вычисляются при каждом рендере, но нигде не применяются. Это лишняя работа — нужно либо использовать, либо удалить.

---

### 2.9 `any` типы в моделях

**Файл:** `models/CardModel.ts`

```ts
// Многократно используется any вместо конкретных типов
const cardsRaw = await db.getAllAsync<any>(...)
const result = dictionaryId
  ? await db.getFirstAsync<any>(...)
  : await db.getFirstAsync<any>(...)
```

Нужно создать внутренний тип для строки из БД (например `CardRow`) и использовать его:

```ts
type CardRow = {
  id: number;
  word: string;
  translation: string;
  transcription: string | null;
  explanation: string | null;
  rating: number;
  dictionary_id: number;
  created_at: string;
};
```

---

## 3. Производительность

### 3.1 N+1 запросов в `allWithExamplesByDictionary`

**Файл:** `models/CardModel.ts`, строки 159–168

```ts
static async allWithExamplesByDictionary(dictionaryId: number): Promise<TCard[]> {
  const cards = await db.getAllAsync<any>('SELECT * FROM cards WHERE ...');
  const result: TCard[] = [];
  for (const c of cards) {
    // ← N отдельных запросов к БД для N карточек
    const examples = await db.getAllAsync<any>('SELECT ... FROM examples WHERE card_id = ?', [c.id]);
    result.push({ ...c, ... });
  }
  return result;
}
```

При 100 карточках — 101 запрос. Нужно заменить на JOIN или один `IN`-запрос:

```ts
// Вариант 1: JOIN (один запрос)
const rows = await db.getAllAsync<any>(
  `SELECT c.*, e.id as ex_id, e.sentence
   FROM cards c
   LEFT JOIN examples e ON e.card_id = c.id
   WHERE c.dictionary_id = ?
   ORDER BY c.id ASC`,
  [dictionaryId],
);
// затем агрегировать примеры по card.id

// Вариант 2: два запроса вместо N+1
const cards = await db.getAllAsync<any>(
  "SELECT * FROM cards WHERE dictionary_id = ?",
  [dictionaryId],
);
const cardIds = cards.map((c) => c.id);
const examples = await db.getAllAsync<any>(
  `SELECT * FROM examples WHERE card_id IN (${cardIds.map(() => "?").join(",")})`,
  cardIds,
);
// затем сгруппировать
```

Этот метод используется для CSV-экспорта, что делает его критичным по производительности.

---

### 3.2 Двойной запрос в `getQuizPool`

**Файл:** `models/CardModel.ts`, строки 170–192

```ts
static async getQuizPool(dictionaryId: number): Promise<TCard[]> {
  // Сначала COUNT
  const countRow = await db.getFirstAsync<{ cnt: number }>(
    'SELECT COUNT(*) as cnt FROM cards WHERE dictionary_id = ?', [dictionaryId]
  );
  const total = countRow?.cnt ?? 0;
  if (total < 3) return [];

  // Потом SELECT всех
  const rows = await db.getAllAsync<any>(
    'SELECT * FROM cards WHERE dictionary_id = ? ORDER BY RANDOM()', [dictionaryId]
  );
  return ...
}
```

Два обращения к БД там, где хватит одного. Можно убрать COUNT и просто проверить длину результата:

```ts
const rows = await db.getAllAsync<any>(
  "SELECT * FROM cards WHERE dictionary_id = ? ORDER BY RANDOM()",
  [dictionaryId],
);
if (rows.length < 3) return [];
```

---

### 3.3 `getOptionColors` вызывается без мемоизации

**Файл:** `app/(tabs)/quiz.tsx`, строки 143–156

```tsx
const getOptionColors = (option: string) => {
  // Вычисляется для каждой опции на каждый рендер
  if (!answered || !currentCard) {
    return { backgroundColor: '#0e1c1c', borderColor: '#1e4747' };
  }
  // ...
};

// В render:
{options.map((option) => {
  const colors = getOptionColors(option);  // ← 5 вызовов на каждый рендер
  return <Pressable style={colors} ... />;
})}
```

Лучше вынести цвета как константы и вычислять стиль один раз:

```tsx
const COLORS = {
  default: { backgroundColor: "#0e1c1c", borderColor: "#1e4747" },
  correct: { backgroundColor: "#166534", borderColor: "#22c55e" },
  wrong: { backgroundColor: "#991b1b", borderColor: "#ef4444" },
} as const;

// Мемоизировать маппинг при изменении answered/selectedOption
const optionStyles = useMemo(() => {
  return Object.fromEntries(options.map((opt) => [opt, computeStyle(opt)]));
}, [options, answered, selectedOption, currentCard]);
```

---

### 3.4 `CardModel.all()` не загружает примеры — несогласованность API

**Файл:** `models/CardModel.ts`, строки 25–52

```ts
static async all(...): Promise<TCard[]> {
  // ...
  // Закомментированная загрузка примеров
  return cardsRaw; // примеры = undefined
}
```

Все остальные методы (`findById`, `findByWord`, `nextCard`, `prevCard`, `firstCard`, `lastCard`) возвращают карточки с примерами. Метод `all()` — нет. Это создаёт непредсказуемое поведение: `card.examples` будет `undefined` для карточек из `all()`, но массивом для остальных.

Тип `TCard` должен иметь `examples: TExample[]` — либо все методы должны его возвращать, либо нужно использовать два разных типа: `TCardSummary` (без примеров) и `TCardFull`.

---

### 3.5 Отсутствует пагинация при поиске

**Файл:** `models/CardModel.ts`, метод `find()`, строки 54–72

```ts
static async find(text: string, dictionaryId?: number): Promise<TCard[] | []> {
  // Возвращает ВСЕ совпадения без лимита
  const cardsRaw = dictionaryId
    ? await db.getAllAsync<any>('SELECT * FROM cards WHERE ... (word LIKE ? OR translation LIKE ?)', ...)
```

При большом словаре (1000+ слов) поиск может вернуть сотни строк и подвесить UI. Нужно добавить `LIMIT`.

---

### 3.6 `AppContext` не сохраняет выбор пользователя

**Файл:** `context/AppContext.tsx`

```tsx
const [currentLanguageId, setCurrentLanguageId] = useState<number | null>(null);
const [currentDictionaryId, setCurrentDictionaryId] = useState<number | null>(
  null,
);
```

После закрытия и повторного открытия приложения выбранный язык и словарь сбрасываются на дефолтные. Нужно сохранять в `AsyncStorage`:

```tsx
import AsyncStorage from "@react-native-async-storage/async-storage";

// При инициализации читать сохранённые ID
const saved = await AsyncStorage.getItem("currentDictionaryId");
if (saved) setCurrentDictionaryId(Number(saved));

// При изменении — сохранять
const handleSetDictionary = useCallback((id: number) => {
  setCurrentDictionaryId(id);
  AsyncStorage.setItem("currentDictionaryId", String(id));
}, []);
```

---

## 4. UI / UX

### 4.1 Magic numbers в `paddingBottom`

**Файл:** `app/(tabs)/quiz.tsx`, строка 159

```tsx
style={{ paddingBottom: (tabBarHeight || 0) + insets.bottom + 156 }}
//                                                              ^^^^ magic number
```

**Файл:** `screens/MainCardScreen.tsx`, строка 143

```tsx
style={{ position: 'absolute', bottom: insets.bottom + 70 }}
//                                                      ^^ magic number
```

Подобные числа нужно выносить в константы с понятным именем или рассчитывать динамически. Значение `156` в quiz.tsx появилось как паддинг под прилипший score-блок — его нужно привязать к реальной высоте блока через `onLayout`.

**Правильный подход:**

```tsx
const [scoreBarHeight, setScoreBarHeight] = useState(0);
// ...
<View style={{ paddingBottom: tabBarHeight + insets.bottom + scoreBarHeight + 12 }}>
// ...
<View onLayout={(e) => setScoreBarHeight(e.nativeEvent.layout.height)} ...>
```

---

### 4.2 `h-48` на компоненте `Text` в `MainCardScreen`

**Файл:** `screens/MainCardScreen.tsx`, строки 151, 158

```tsx
<Text className='text-primary-100 text-2xl ml-3 h-48'>Назад</Text>
<Text className='text-white text-2xl mr-3 h-48'>Далее</Text>
```

`h-48` (высота 192px) на элементе `Text` — бессмысленно. `Text` не растягивается по высоте в React Native так же, как `View`. Нужно убрать этот класс.

---

### 4.3 `repeat.tsx` — экран выпадает из общего дизайн-системы

Экран `Повтор` выглядит как необработанный прототип: белый фон, стандартные кнопки `Button` из React Native, нет NativeWind-стилей. Это единственный экран с таким внешним видом — пользователь увидит резкий переход.

---

### 4.4 Отсутствуют состояния загрузки на большинстве экранов

Пока карточки загружаются из SQLite, пользователь видит пустой экран. Нужны индикаторы загрузки (`ActivityIndicator`) или скелетоны.

**Пример исправления для `CardListScreen`:**

```tsx
const [loading, setLoading] = useState(true);

// В loadCards:
setLoading(true);
const list = await CardModel.all(...);
setCards(list);
setLoading(false);

// В JSX:
{loading ? (
  <ActivityIndicator size='large' color='#22c55e' style={{ flex: 1 }} />
) : (
  <FlatList ... />
)}
```

---

### 4.5 Отсутствует состояние "нет карточек" (`EmptyState`)

В `CardListScreen` и `MainCardScreen` при пустом словаре пользователь видит пустой список или ничего. Нужен явный empty state с призывом к действию.

```tsx
ListEmptyComponent={() => (
  <View className='flex-1 items-center justify-center py-20'>
    <Text className='text-primary-100 opacity-60 text-center'>
      В этом словаре пока нет карточек.{'\n'}
      Нажмите «+» чтобы добавить первую.
    </Text>
  </View>
)}
```

---

### 4.6 Фильтры в `CardListScreen` горизонтально переполнены

Три кнопки фильтра рейтинга (`Скрыть: Не знаю`, `Плохо`, `Хорошо`) расположены в одном `flex-row` без прокрутки. На экранах < 375px они могут не помещаться.

---

### 4.7 Нет haptic feedback на ключевых действиях

`expo-haptics` подключён как зависимость, но используется ли он — не видно в основных экранах. Тактильная обратная связь улучшает ощущение при нажатии на карточку, ответе в квизе и т.д.

```tsx
import * as Haptics from "expo-haptics";

// При правильном ответе в квизе:
await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

// При неправильном:
await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

// При flip карточки:
await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
```

---

## 5. Архитектура и структура

### 5.1 `AppContext` минимален — нет обработки ошибок инициализации

**Файл:** `context/AppContext.tsx`

```tsx
useEffect(() => {
  const ensureDefaults = async () => {
    const langId = await LanguageModel.firstOrCreateDefault();
    setCurrentLanguageId(langId);
    const dictId =
      await DictionaryModel.firstOrCreateDefaultForLanguage(langId);
    setCurrentDictionaryId(dictId);
  };
  ensureDefaults(); // ← нет try/catch, нет индикации ошибки пользователю
}, []);
```

Если БД не проинициализирована или упала, контекст останется с `null` и все экраны будут работать некорректно. Нужен `try/catch` и состояние `error`.

---

### 5.2 Дублирование паттерна загрузки карточки с примерами

В `CardModel` четыре метода делают одно и то же: загружают карточку + примеры.

```ts
// nextCard, prevCard, firstCard, lastCard — одинаковый финальный блок:
const examples = await db.getAllAsync<TExample>(
  "SELECT * FROM examples WHERE card_id = ?",
  [result.id],
);
return {
  ...result,
  dictionaryId: (result as any).dictionary_id,
  examples,
  show: false,
};
```

Нужно вынести в приватный хелпер:

```ts
private static async attachExamples(row: CardRow): Promise<TCard> {
  const examples = await getDB().getAllAsync<TExample>(
    'SELECT id, sentence FROM examples WHERE card_id = ?', [row.id]
  );
  return { ...row, dictionaryId: row.dictionary_id, examples, show: false };
}
```

---

### 5.3 `(tabs)/_layout.tsx` — пустой файл

**Файл:** `app/(tabs)/_layout.tsx`

```tsx
import { Slot } from "expo-router";
export default function TabLayout() {
  return <Slot />;
}
```

Если таб-лейаут не нужен, файл можно удалить. Если нужен — нужно настроить правильно (заголовки, скрытие/показ вкладок и т.д.). Текущий `Slot` — это транзитный wrapper без конфигурации.

---

### 5.4 Отсутствуют Error Boundaries

В React Native ошибка в одном компоненте может уронить всё приложение. Нужен хотя бы один `ErrorBoundary` на верхнем уровне.

```tsx
// app/_layout.tsx
import { ErrorBoundary } from "expo-router";
export { ErrorBoundary };
// или собственный класс-компонент
```

---

### 5.5 Нет тестов

В проекте нет ни одного теста (unit, integration, e2e). Минимальный набор:

- Unit-тесты для `CardModel.clampRating`, `nextRatingByAnswer`, `shuffle`
- Unit-тесты для CSV-парсера (критически важная логика)
- Snapshot-тесты для ключевых компонентов

---

## 6. Лучшие практики React Native

### 6.1 `useCallback` и `useMemo` — когда использовать

```tsx
// ✅ Используйте useCallback для функций, передаваемых дочерним компонентам
const handleDelete = useCallback((id: number) => {
  setPendingDeleteId(id);
  setConfirmVisible(true);
}, []); // зависимости должны быть полными

// ✅ Используйте useMemo для дорогих вычислений
const sortedCards = useMemo(() => {
  return [...cards].sort((a, b) => (a.rating ?? 0) - (b.rating ?? 0));
}, [cards]);

// ❌ Не оборачивайте всё подряд — это добавляет оверхед
const simpleValue = useMemo(() => count + 1, [count]); // избыточно
```

### 6.2 Всегда полные зависимости в хуках

```tsx
// ❌ Неправильно — stale closure
useFocusEffect(
  useCallback(() => {
    loadCards();
  }, []),
); // loadCards использует currentDictionaryId, но не в deps

// ✅ Правильно
const loadCards = useCallback(async () => {
  if (!currentDictionaryId) return;
  const list = await CardModel.all(20, 0, currentDictionaryId);
  setCards(list);
}, [currentDictionaryId]);

useFocusEffect(
  useCallback(() => {
    loadCards();
  }, [loadCards]),
);
```

### 6.3 `FlatList` — ключевые оптимизации

```tsx
<FlatList
  data={visibleCards}
  keyExtractor={(item) => item.id.toString()} // ✅ уже есть
  renderItem={renderCard} // ✅ выносить renderItem за пределы JSX
  // Добавить:
  removeClippedSubviews={true} // освобождает память для невидимых элементов
  maxToRenderPerBatch={10} // контроль порций рендера
  windowSize={10} // количество "экранов" в памяти
  initialNumToRender={15} // начальный рендер
  getItemLayout={(_, index) => ({
    // если высота фиксирована — большой буст
    length: CARD_HEIGHT,
    offset: CARD_HEIGHT * index,
    index,
  })}
/>
```

### 6.4 `React.memo` для компонентов списка

```tsx
// Без memo Card ре-рендерится при каждом изменении родителя
// ✅ Правильно:
const Card = React.memo(({ card, onDelete, onEdit, onPress }: CardProps) => {
  // ...
});
```

### 6.5 Избегайте анонимных функций в JSX

```tsx
// ❌ Создаёт новую функцию при каждом рендере
<Button onPress={() => router.push("/quiz")} />;

// ✅ Вынесите в useCallback
const handleGoToQuiz = useCallback(() => router.push("/quiz"), []);
<Button onPress={handleGoToQuiz} />;
```

### 6.6 `KeyboardAvoidingView` — правильное использование

```tsx
// ✅ Правильно: поведение зависит от платформы
<KeyboardAvoidingView
  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  // На Android часто лучше работает 'height' или вовсе AndroidManifest.xml
>
```

### 6.7 Accessibility (доступность)

```tsx
// ✅ Добавляйте accessibilityLabel к интерактивным элементам
<Pressable
  accessibilityRole="button"
  accessibilityLabel="Удалить карточку"
  onPress={onDelete}
>

// ✅ Для иконок без текста
<IconSymbol
  name="trash.fill"
  accessibilityLabel="Удалить"
/>
```

### 6.8 Избегайте `any` — используйте строгую типизацию

```tsx
// ❌ Плохо
const result = await db.getFirstAsync<any>("SELECT * FROM cards WHERE id = ?", [
  id,
]);

// ✅ Хорошо — создайте тип для строки БД
type CardRow = {
  id: number;
  word: string;
  translation: string;
  transcription: string | null;
  explanation: string | null;
  rating: number;
  dictionary_id: number;
  created_at: string;
};
const result = await db.getFirstAsync<CardRow>(
  "SELECT * FROM cards WHERE id = ?",
  [id],
);
```

### 6.9 AsyncStorage для персистентных настроек

```tsx
// Любые пользовательские настройки (выбранный словарь, тема, режим) должны
// сохраняться между сессиями через @react-native-async-storage/async-storage
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEYS = {
  CURRENT_DICT: "app:currentDictionaryId",
  CURRENT_LANG: "app:currentLanguageId",
} as const;
```

### 6.10 Структура файлов — feature-based организация

По мере роста проекта плоская структура усложняется. Рекомендуется feature-based:

```
features/
  cards/
    CardModel.ts
    CardListScreen.tsx
    Card.tsx
    useCards.ts       ← кастомный хук
  quiz/
    QuizScreen.tsx
    useQuiz.ts
  library/
    LibraryScreen.tsx
    DictionaryModel.ts
    LanguageModel.ts
```

### 6.11 Кастомные хуки для бизнес-логики

Выносите логику загрузки и управления данными из компонентов в хуки:

```tsx
// hooks/useCards.ts
export function useCards(dictionaryId: number | null) {
  const [cards, setCards] = useState<TCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    if (!dictionaryId) return;
    setLoading(true);
    try {
      const list = await CardModel.all(100, 0, dictionaryId);
      setCards(list);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setLoading(false);
    }
  }, [dictionaryId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return { cards, loading, error, reload: load };
}

// Использование в компоненте — чисто и просто:
const { cards, loading } = useCards(currentDictionaryId);
```

### 6.12 Константы вместо магических чисел и строк

```tsx
// ❌ Magic strings и numbers по всему коду
if (card.rating === 2) ...
<IconSymbol name='battery.100' />

// ✅ Константы
const RATING = { NONE: 0, BAD: 1, GOOD: 2 } as const;
const RATING_ICONS = {
  [RATING.NONE]: 'battery.0',
  [RATING.BAD]: 'battery.50',
  [RATING.GOOD]: 'battery.100',
} as const;

if (card.rating === RATING.GOOD) ...
<IconSymbol name={RATING_ICONS[card.rating ?? RATING.NONE]} />
```

---

## 7. Рекомендации по рефакторингу — приоритеты

### 🔴 Критично (исправить немедленно)

1. **`repeat.tsx`**: Заменить `level` на `rating` в SQL-запросах — экран полностью нерабочий
2. **`FrontCard.tsx` строка 47**: Убрать захардкоженный текст, заменить на `card.explanation`
3. **`database.ts` строка 88**: Заменить строковую интерполяцию в SQL на параметризованный запрос

### 🟠 Важно (исправить в ближайшее время)

4. **Удалить все `console.log`** из `CardListScreen`, `MainCardScreen`
5. **Дублирующий импорт** `ScrollView` в `CardListScreen`
6. **Missing deps** в `useEffect`/`useFocusEffect` (`MainCardScreen`, `CardListScreen`)
7. **`AppContext`**: Добавить `AsyncStorage` для сохранения выбранного словаря между сессиями
8. **`allWithExamplesByDictionary`**: Убрать N+1 запрос

### 🟡 Желательно (следующий спринт)

9. **Вынести хелпер `attachExamples`** в `CardModel` — убрать дублирование
10. **Добавить состояния загрузки** (`loading`) на экраны
11. **`EmptyState`** компонент для пустых списков
12. **Добавить `React.memo`** к компоненту `Card`
13. **Haptic feedback** в квизе и при флипе карточки
14. **Убрать мёртвый код** (закомментированные блоки)
15. **Константы для magic numbers** (`156`, `70`)

### 🔵 Архитектурно (долгосрочно)

16. **Кастомные хуки** `useCards`, `useQuiz` для выноса логики из компонентов
17. **Тип `CardRow`** вместо `any` в моделях
18. **Error Boundary** на уровне `_layout.tsx`
19. **Тесты** (начать с unit-тестов для моделей)
20. **`repeat.tsx`**: Полный рефакторинг с интеграцией в дизайн-систему

---

_Этот файл сгенерирован в ходе код-ревью проекта. Обновляйте по мере исправления проблем._
