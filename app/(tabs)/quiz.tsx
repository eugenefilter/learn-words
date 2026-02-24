import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { CardModel } from '@/models/CardModel';
import { TCard } from '@/types/TCard';
import { useAppContext } from '@/context/AppContext';
import Button from '@/components/ui/Button';
import { FLOATING_PANEL_GAP, QUIZ_CONTENT_BOTTOM_PADDING } from '@/constants/layout';
import { QUIZ_WRONG_OPTIONS, QUIZ_TOTAL_OPTIONS, QUIZ_MIN_CARDS, QUIZ_MIN_UNIQUE_TRANSLATIONS } from '@/constants/quiz';
import * as Haptics from 'expo-haptics';
import { DictionaryModel } from '@/models/DictionaryModel';
import DictionaryPicker from '@/components/library/DictionaryPicker';

type QuizState = 'loading' | 'ready' | 'insufficient' | 'completed';

const normalizeAnswer = (value: string | null | undefined): string => (value || '').trim();

const shuffle = <T,>(items: T[]): T[] => {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

export default function QuizScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { currentDictionaryId, setCurrentDictionaryId } = useAppContext();

  const [quizCards, setQuizCards] = useState<TCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [options, setOptions] = useState<string[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false); // true after first answer in current question
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [state, setState] = useState<QuizState>('loading');
  const [dictionaryName, setDictionaryName] = useState('Словарь');
  const [dictionaryPickerVisible, setDictionaryPickerVisible] = useState(false);

  const currentCard = quizCards[currentIndex] ?? null;
  const currentCardTranslation = normalizeAnswer(currentCard?.translation);
  const panelBottomOffset = (tabBarHeight || 0) + FLOATING_PANEL_GAP;

  useEffect(() => {
    let cancelled = false;

    const loadCurrentDictionaryName = async () => {
      if (!currentDictionaryId) {
        if (!cancelled) setDictionaryName('Словарь');
        return;
      }

      const dict = await DictionaryModel.findById(currentDictionaryId);
      if (!cancelled) {
        setDictionaryName(dict?.name?.trim() || 'Словарь');
      }
    };

    loadCurrentDictionaryName();
    return () => {
      cancelled = true;
    };
  }, [currentDictionaryId]);

  const buildOptionsForCard = useCallback(async (card: TCard, pool: TCard[]) => {
    if (!currentDictionaryId) {
      setOptions([]);
      return;
    }

    const correct = (card.translation || '').trim();
    const wrongFromDb = await CardModel.getWrongOptions(currentDictionaryId, card.id, QUIZ_WRONG_OPTIONS);

    const uniqueWrong = Array.from(new Set(wrongFromDb.map((v) => (v || '').trim())))
      .filter((v) => v.length > 0 && v !== correct);

    const fallbackWrong = pool
      .filter((c) => c.id !== card.id)
      .map((c) => (c.translation || '').trim())
      .filter((v) => v.length > 0 && v !== correct && !uniqueWrong.includes(v));

    const fullWrong = [...uniqueWrong, ...fallbackWrong].slice(0, QUIZ_WRONG_OPTIONS);

    if (fullWrong.length < QUIZ_WRONG_OPTIONS || !correct) {
      setOptions([]);
      return;
    }

    setOptions(shuffle([correct, ...fullWrong]));
  }, [currentDictionaryId]);

  const startQuiz = useCallback(async () => {
    setState('loading');
    setSelectedOption(null);
    setAnswered(false);
    setCurrentIndex(0);
    setCorrectCount(0);
    setWrongCount(0);
    setOptions([]);

    if (!currentDictionaryId) {
      setQuizCards([]);
      setState('insufficient');
      return;
    }

    const pool = await CardModel.getQuizPool(currentDictionaryId);
    if (pool.length < QUIZ_MIN_CARDS) {
      setQuizCards([]);
      setState('insufficient');
      return;
    }

    const uniqueTranslations = new Set(
      pool.map((c) => (c.translation || '').trim()).filter((v) => v.length > 0)
    );

    if (uniqueTranslations.size < QUIZ_MIN_UNIQUE_TRANSLATIONS) {
      setQuizCards([]);
      setState('insufficient');
      return;
    }

    setQuizCards(pool);
    await buildOptionsForCard(pool[0], pool);
    setState('ready');
  }, [buildOptionsForCard, currentDictionaryId]);

  useFocusEffect(
    useCallback(() => {
      startQuiz();
      return undefined;
    }, [startQuiz])
  );

  const goToNextCard = useCallback(async () => {
    if (!answered) return;
    if (currentIndex >= quizCards.length - 1) {
      setState('completed');
      return;
    }

    const nextIndex = currentIndex + 1;
    const nextCard = quizCards[nextIndex];
    setCurrentIndex(nextIndex);
    setSelectedOption(null);
    setAnswered(false);
    setOptions([]);
    await buildOptionsForCard(nextCard, quizCards);
  }, [answered, buildOptionsForCard, currentIndex, quizCards]);

  const onSelectOption = useCallback(async (option: string) => {
    setSelectedOption(option);
    if (!currentCard || options.length !== QUIZ_TOTAL_OPTIONS) return;
    if (answered) return;

    const isCorrect = normalizeAnswer(option) === normalizeAnswer(currentCard.translation);
    setAnswered(true);

    if (isCorrect) {
      setCorrectCount((prev) => prev + 1);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      setWrongCount((prev) => prev + 1);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }

    await CardModel.updateRatingAfterAnswer(currentCard.id, isCorrect);
  }, [answered, currentCard, options.length]);

  const progressText = useMemo(() => {
    if (quizCards.length === 0) return '0/0';
    return `${Math.min(currentIndex + 1, quizCards.length)}/${quizCards.length}`;
  }, [currentIndex, quizCards.length]);

  const OPTION_COLORS = {
    neutral: { backgroundColor: '#0e1c1c', borderColor: '#1e4747' },
    correct: { backgroundColor: '#166534', borderColor: '#22c55e' },
    wrong:   { backgroundColor: '#991b1b', borderColor: '#ef4444' },
  } as const;

  const optionColors = useMemo(() => {
    const map = new Map<string, { backgroundColor: string; borderColor: string }>();
    for (const option of options) {
      if (!answered || !currentCard) {
        map.set(option, OPTION_COLORS.neutral);
      } else if (selectedOption === option) {
        map.set(option, normalizeAnswer(option) === currentCardTranslation
          ? OPTION_COLORS.correct
          : OPTION_COLORS.wrong);
      } else {
        map.set(option, OPTION_COLORS.neutral);
      }
    }
    return map;
  }, [options, answered, selectedOption, currentCard, currentCardTranslation]);

  return (
    <View className='flex-1 bg-primary-900 px-5 pt-6' style={{ paddingBottom: (tabBarHeight || 0) + insets.bottom + QUIZ_CONTENT_BOTTOM_PADDING }}>
      <View className='flex-row items-center justify-between mb-4'>
        <Text className='text-primary-100 text-2xl'>Квиз</Text>
        <Pressable
          onPress={() => setDictionaryPickerVisible(true)}
          className='max-w-[72%] px-3 py-2 rounded-xl border border-primary-300 bg-primary-800'
        >
          <Text className='text-primary-100 text-sm' numberOfLines={1}>{dictionaryName}</Text>
        </Pressable>
      </View>

      {state === 'loading' && (
        <View className='flex-1 items-center justify-center'>
          <Text className='text-primary-100 opacity-80'>Загрузка квиза...</Text>
        </View>
      )}

      {state === 'insufficient' && (
        <View className='flex-1 items-center justify-center'>
          <Text className='text-primary-100 text-center mb-4'>
            Недостаточно данных для квиза. Нужно минимум 5 карточек с разными переводами в выбранном словаре.
          </Text>
          <Button title='Обновить' onPress={startQuiz} />
        </View>
      )}

      {state === 'ready' && currentCard && (
        <ScrollView
          className='flex-1'
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 8 }}
        >
          <View className='rounded-2xl border border-primary-200 bg-primary-800 p-4 mb-4'>
            <Text className='text-primary-100 opacity-80 mb-2'>Вопрос {progressText}</Text>
            <Text className='text-primary-100 text-3xl font-semibold'>{currentCard.word}</Text>
          </View>

          <View className='gap-3'>
            {options.map((option) => {
              const colors = optionColors.get(option);
              return (
                <Pressable
                  key={option}
                  disabled={options.length !== QUIZ_TOTAL_OPTIONS}
                  onPress={() => onSelectOption(option)}
                  className='rounded-xl border px-4 py-4'
                  style={colors}
                >
                  <Text className='text-white text-lg'>{option}</Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      )}

      {state === 'completed' && (
        <View className='flex-1 items-center justify-center'>
          <Text className='text-primary-100 text-2xl mb-2'>Квиз завершен</Text>
          <Text className='text-primary-100 mb-1'>Верно: {correctCount}</Text>
          <Text className='text-primary-100 mb-4'>Неверно: {wrongCount}</Text>
          <Button title='Пройти снова' onPress={startQuiz} />
        </View>
      )}

      {state === 'ready' && (
        <View
          style={{
            position: 'absolute',
            left: 20,
            right: 20,
            bottom: panelBottomOffset,
            zIndex: 20,
            elevation: 20,
          }}
        >
          <View className='rounded-xl border border-primary-200 bg-primary-800 p-3 mb-3'>
            <Text className='text-primary-100'>Верно: {correctCount}</Text>
            <Text className='text-primary-100'>Неверно: {wrongCount}</Text>
          </View>
          <Button
            title='Дальше'
            onPress={goToNextCard}
            disabled={!answered}
          />
        </View>
      )}

      <DictionaryPicker
        visible={dictionaryPickerVisible}
        onClose={() => setDictionaryPickerVisible(false)}
        onSelect={(dictionaryId) => {
          setCurrentDictionaryId(dictionaryId);
        }}
      />
    </View>
  );
}
