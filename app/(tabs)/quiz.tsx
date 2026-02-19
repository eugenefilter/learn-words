import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CardModel } from '@/models/CardModel';
import { TCard } from '@/types/TCard';
import { useAppContext } from '@/context/AppContext';
import Button from '@/components/ui/Button';

type QuizState = 'loading' | 'ready' | 'insufficient' | 'completed';

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
  const { currentDictionaryId } = useAppContext();

  const [quizCards, setQuizCards] = useState<TCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [options, setOptions] = useState<string[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [wrongCount, setWrongCount] = useState(0);
  const [state, setState] = useState<QuizState>('loading');

  const currentCard = quizCards[currentIndex] ?? null;

  const buildOptionsForCard = useCallback(async (card: TCard, pool: TCard[]) => {
    if (!currentDictionaryId) {
      setOptions([]);
      return;
    }

    const correct = (card.translation || '').trim();
    const wrongFromDb = await CardModel.getWrongOptions(currentDictionaryId, card.id, 4);

    const uniqueWrong = Array.from(new Set(wrongFromDb.map((v) => (v || '').trim())))
      .filter((v) => v.length > 0 && v !== correct);

    const fallbackWrong = pool
      .filter((c) => c.id !== card.id)
      .map((c) => (c.translation || '').trim())
      .filter((v) => v.length > 0 && v !== correct && !uniqueWrong.includes(v));

    const fullWrong = [...uniqueWrong, ...fallbackWrong].slice(0, 4);

    if (fullWrong.length < 4 || !correct) {
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
    if (pool.length < 5) {
      setQuizCards([]);
      setState('insufficient');
      return;
    }

    const uniqueTranslations = new Set(
      pool.map((c) => (c.translation || '').trim()).filter((v) => v.length > 0)
    );

    if (uniqueTranslations.size < 5) {
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
    await buildOptionsForCard(nextCard, quizCards);
  }, [buildOptionsForCard, currentIndex, quizCards]);

  const onSelectOption = useCallback(async (option: string) => {
    if (!currentCard || answered || options.length !== 5) return;

    const isCorrect = option === currentCard.translation;
    setSelectedOption(option);
    setAnswered(true);

    if (isCorrect) setCorrectCount((prev) => prev + 1);
    else setWrongCount((prev) => prev + 1);

    await CardModel.updateRatingAfterAnswer(currentCard.id, isCorrect);
  }, [answered, currentCard, options.length]);

  const progressText = useMemo(() => {
    if (quizCards.length === 0) return '0/0';
    return `${Math.min(currentIndex + 1, quizCards.length)}/${quizCards.length}`;
  }, [currentIndex, quizCards.length]);

  const getOptionColors = (option: string) => {
    if (!answered || !currentCard) {
      return { backgroundColor: '#0e1c1c', borderColor: '#1e4747' };
    }

    if (selectedOption === option) {
      const isSelectedCorrect = option === currentCard.translation;
      return isSelectedCorrect
        ? { backgroundColor: '#166534', borderColor: '#22c55e' }
        : { backgroundColor: '#991b1b', borderColor: '#ef4444' };
    }

    return { backgroundColor: '#0e1c1c', borderColor: '#1e4747' };
  };

  return (
    <View className='flex-1 bg-primary-900 px-5 pt-6' style={{ paddingBottom: insets.bottom + 16 }}>
      <Text className='text-primary-100 text-2xl mb-2'>Квиз</Text>
      <Text className='text-primary-100 opacity-80 mb-4'>Текущий словарь. Выберите правильный перевод.</Text>

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
        <View className='flex-1'>
          <View className='rounded-2xl border border-primary-200 bg-primary-800 p-4 mb-4'>
            <Text className='text-primary-100 opacity-80 mb-2'>Вопрос {progressText}</Text>
            <Text className='text-primary-100 text-3xl font-semibold'>{currentCard.word}</Text>
          </View>

          <View className='gap-3'>
            {options.map((option) => {
              const colors = getOptionColors(option);
              return (
                <Pressable
                  key={option}
                  disabled={answered || options.length !== 5}
                  onPress={() => onSelectOption(option)}
                  className='rounded-xl border px-4 py-4'
                  style={colors}
                >
                  <Text className='text-white text-lg'>{option}</Text>
                </Pressable>
              );
            })}
          </View>

          <View className='mt-6 rounded-xl border border-primary-200 bg-primary-800 p-3'>
            <Text className='text-primary-100'>Верно: {correctCount}</Text>
            <Text className='text-primary-100'>Неверно: {wrongCount}</Text>
          </View>

          <View className='mt-auto pt-4'>
            <Button
              title='Дальше'
              onPress={goToNextCard}
              disabled={!answered}
            />
          </View>
        </View>
      )}

      {state === 'completed' && (
        <View className='flex-1 items-center justify-center'>
          <Text className='text-primary-100 text-2xl mb-2'>Квиз завершен</Text>
          <Text className='text-primary-100 mb-1'>Верно: {correctCount}</Text>
          <Text className='text-primary-100 mb-4'>Неверно: {wrongCount}</Text>
          <Button title='Пройти снова' onPress={startQuiz} />
        </View>
      )}
    </View>
  );
}
