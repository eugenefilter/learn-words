# Code Review — VocabCardsApp

> Дата ревью: 2026-02-19
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
const result = await db.getAllAsync<Card>('SELECT * FROM cards WHERE level <= 3');

// 2. Обновление несуществующей колонки
await db.runAsync('UPDATE cards SET level = ? WHERE id = ?', [newLevel, card.id]);
```

Экран `Repeat` полностью нерабочий: запрос всегда вернёт пустой массив, а UPDATE не изменит ничего, потому что колонки `level` в таблице `cards` нет. Нужно заменить на `rating`.

**Исправление:**
```tsx
// Правильный запрос — колонка называется `rating`
'SELECT * FROM cards WHERE rating <= 1'
// Обновление тоже через rating
'UPDATE cards SET rating = ? WHERE id = ?'
```

---

### 1.2 `FrontCard.tsx` — захардкоженный placeholder-текст в продакшн-коде

**Файл:** `components/card/FrontCard.tsx`, строка 47

```tsx
// БАГИ: это тестовый текст, который попал в прод
<Text className='text-primary-100 text-xl opacity-90 text-center'>
  to limit yourself to doing or using one particular thing and not change to anything else
</Text>
```

Этот текст не связан ни с одним полем `card`. Скорее всего, это должно быть `card.explanation`, но сейчас отображается статичная строка. Поле `explanation` есть в схеме БД и в `TCard`, но нигде не выводится.

**Исправление:**
```tsx
{card.explanation ? (
  <Text className='text-primary-100 text-xl opacity-90 text-center'>
    {card.explanation}
  </Text>
) : null}
```

---

### 1.3 SQL-инъекция в `database.ts`

**Файл:** `database/database.ts`, строка 88

```ts
// РИСК: строковая интерполяция в SQL
await db.execAsync(`UPDATE cards SET dictionary_id = ${dictId} WHERE dictionary_id IS NULL;`);
```

Переменная `dictId` получена из БД и является числом, поэтому прямой угрозы сейчас нет. Однако это плохой паттерн — нужно всегда использовать параметризованные запросы.

**Исправление:**
```ts
await db.runAsync('UPDATE cards SET dictionary_id = ? WHERE dictionary_id IS NULL', [dictId]);
```

---

## 2. Качество кода

### 2.1 `console.log` в продакшн-коде

Несколько `console.log` оставлены в коде и попадут в production-сборку.

| Файл | Строка | Содержимое |
|------|--------|------------|
| `screens/CardListScreen.tsx` | 64 | `console.log(value)` |
| `screens/MainCardScreen.tsx` | 52 | `console.log(prev)` |
| `screens/MainCardScreen.tsx` | 65 | `console.log(next)` |

Все три нужно удалить. Для отладки в будущем используйте `__DEV__ && console.log(...)`.

---

### 2.2 Дублирующий импорт `ScrollView` в `CardListScreen`

**Файл:** `screens/CardListScreen.tsx`

```tsx
import { View, Text, Pressable } from 'react-native'   // строка 4
import { FlatList } from 'react-native'                 // строка 5
// ...
import { ScrollView } from 'react-native'               // строка 15 — дубль!
```

Нужно объединить в один импорт:
```tsx
import { View, Text, Pressable, FlatList, ScrollView } from 'react-native'
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
  }, [])  // ← пустой массив deps, но функции ссылаются на currentDictionaryId
)
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
    const first = await CardModel.firstCard(currentDictionaryId || undefined)
    // ...
  }
  loadById()
}, [id])  // ← currentDictionaryId не в зависимостях!
```

При смене словаря карточка не перезагружается. Нужно добавить `currentDictionaryId` в deps.

---

### 2.6 Закомментированный мёртвый код

| Файл | Строки | Описание |
|------|--------|----------|
| `models/CardModel.ts` | 38–50 | Закомментированная загрузка примеров в `all()` |
| `components/card/FlipCard.tsx` | 107 | `// styles.cardBack` |
| `screens/CardListScreen.tsx` | 143–148 | Закомментированная кнопка "Add Card" |

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
  [dictionaryId]
);
// затем агрегировать примеры по card.id

// Вариант 2: два запроса вместо N+1
const cards = await db.getAllAsync<any>('SELECT * FROM cards WHERE dictionary_id = ?', [dictionaryId]);
const cardIds = cards.map(c => c.id);
const examples = await db.getAllAsync<any>(
  `SELECT * FROM examples WHERE card_id IN (${cardIds.map(() => '?').join(',')})`,
  cardIds
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
  'SELECT * FROM cards WHERE dictionary_id = ? ORDER BY RANDOM()',
  [dictionaryId]
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
  default: { backgroundColor: '#0e1c1c', borderColor: '#1e4747' },
  correct: { backgroundColor: '#166534', borderColor: '#22c55e' },
  wrong:   { backgroundColor: '#991b1b', borderColor: '#ef4444' },
} as const;

// Мемоизировать маппинг при изменении answered/selectedOption
const optionStyles = useMemo(() => {
  return Object.fromEntries(
    options.map((opt) => [opt, computeStyle(opt)])
  );
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
const [currentDictionaryId, setCurrentDictionaryId] = useState<number | null>(null);
```

После закрытия и повторного открытия приложения выбранный язык и словарь сбрасываются на дефолтные. Нужно сохранять в `AsyncStorage`:

```tsx
import AsyncStorage from '@react-native-async-storage/async-storage';

// При инициализации читать сохранённые ID
const saved = await AsyncStorage.getItem('currentDictionaryId');
if (saved) setCurrentDictionaryId(Number(saved));

// При изменении — сохранять
const handleSetDictionary = useCallback((id: number) => {
  setCurrentDictionaryId(id);
  AsyncStorage.setItem('currentDictionaryId', String(id));
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
import * as Haptics from 'expo-haptics';

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
    const dictId = await DictionaryModel.firstOrCreateDefaultForLanguage(langId);
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
const examples = await db.getAllAsync<TExample>('SELECT * FROM examples WHERE card_id = ?', [result.id]);
return { ...result, dictionaryId: (result as any).dictionary_id, examples, show: false };
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
import { Slot } from 'expo-router';
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
import { ErrorBoundary } from 'expo-router';
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
useFocusEffect(useCallback(() => {
  loadCards();
}, [])); // loadCards использует currentDictionaryId, но не в deps

// ✅ Правильно
const loadCards = useCallback(async () => {
  if (!currentDictionaryId) return;
  const list = await CardModel.all(20, 0, currentDictionaryId);
  setCards(list);
}, [currentDictionaryId]);

useFocusEffect(useCallback(() => {
  loadCards();
}, [loadCards]));
```

### 6.3 `FlatList` — ключевые оптимизации

```tsx
<FlatList
  data={visibleCards}
  keyExtractor={(item) => item.id.toString()} // ✅ уже есть
  renderItem={renderCard}  // ✅ выносить renderItem за пределы JSX

  // Добавить:
  removeClippedSubviews={true}        // освобождает память для невидимых элементов
  maxToRenderPerBatch={10}            // контроль порций рендера
  windowSize={10}                     // количество "экранов" в памяти
  initialNumToRender={15}             // начальный рендер
  getItemLayout={(_, index) => ({     // если высота фиксирована — большой буст
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
<Button onPress={() => router.push('/quiz')} />

// ✅ Вынесите в useCallback
const handleGoToQuiz = useCallback(() => router.push('/quiz'), []);
<Button onPress={handleGoToQuiz} />
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
const result = await db.getFirstAsync<any>('SELECT * FROM cards WHERE id = ?', [id]);

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
const result = await db.getFirstAsync<CardRow>('SELECT * FROM cards WHERE id = ?', [id]);
```

### 6.9 AsyncStorage для персистентных настроек

```tsx
// Любые пользовательские настройки (выбранный словарь, тема, режим) должны
// сохраняться между сессиями через @react-native-async-storage/async-storage
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  CURRENT_DICT: 'app:currentDictionaryId',
  CURRENT_LANG: 'app:currentLanguageId',
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

  useFocusEffect(useCallback(() => { load(); }, [load]));

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

*Этот файл сгенерирован в ходе код-ревью проекта. Обновляйте по мере исправления проблем.*
