import { useFocusEffect } from '@react-navigation/native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useCallback, useState } from 'react';
import { ScrollView, Text, View, Pressable, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppContext } from '@/context/AppContext';
import { CardModel } from '@/models/CardModel';
import Button from '@/components/ui/Button';
import { IconSymbol } from '@/components/ui/IconSymbol';
import RatingProgress from '@/components/ui/RatingProgress';
import * as Haptics from 'expo-haptics';

type RepeatCard = {
  id: number;
  word: string;
  translation: string;
  transcription: string | null;
  rating: number;
  examples: string[];
};

export default function RepeatScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { height: screenHeight } = useWindowDimensions();
  const { currentDictionaryId } = useAppContext();

  const [cards, setCards] = useState<RepeatCard[]>([]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setIndex(0);
    setRevealed(false);

    if (!currentDictionaryId) {
      setCards([]);
      setLoading(false);
      return;
    }

    const data = await CardModel.getRepeatPool(currentDictionaryId);
    setCards(data);
    setLoading(false);
  }, [currentDictionaryId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleAnswer = useCallback(async (delta: number) => {
    const card = cards[index];
    if (!card) return;

    Haptics.notificationAsync(
      delta > 0 ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning
    );

    const newRating = await CardModel.updateRatingAfterAnswer(card.id, delta > 0);

    // Обновляем рейтинг и убираем карточки с rating >= 2 из очереди
    const updatedCards = cards
      .map((c) => (c.id === card.id ? { ...c, rating: newRating ?? c.rating } : c))
      .filter((c) => c.rating < 2);

    setRevealed(false);
    setCards(updatedCards);

    if (updatedCards.length === 0) {
      setIndex(0);
    } else {
      const nextIndex = index + 1;
      setIndex(nextIndex >= updatedCards.length ? 0 : nextIndex);
    }
  }, [cards, index]);

  const card = cards[index] ?? null;
  const cardMinHeight = Math.max(180, screenHeight * 0.28);
  const examplesMaxHeight = Math.max(120, screenHeight * 0.2);

  return (
    <View
      className='flex-1 bg-primary-900 px-5 pt-6'
      style={{ paddingBottom: (tabBarHeight || 0) + insets.bottom + 8 }}
    >
      <Text className='text-primary-100 text-2xl mb-1'>Повтор</Text>
      <Text className='text-primary-100 opacity-60 text-sm mb-4'>
        Карточки с рейтингом «Не знаю» и «Плохо»
      </Text>

      {loading && (
        <View className='flex-1 items-center justify-center'>
          <Text className='text-primary-100 opacity-60'>Загрузка...</Text>
        </View>
      )}

      {!loading && cards.length === 0 && (
        <View className='flex-1 items-center justify-center gap-4'>
          <IconSymbol name='battery.100' size={48} color='#22c55e' />
          <Text className='text-primary-100 text-xl text-center'>Отлично!</Text>
          <Text className='text-primary-100 opacity-60 text-center'>
            В этом словаре нет карточек для повтора.{'\n'}
            Все карточки имеют рейтинг «Хорошо».
          </Text>
          <Button title='Обновить' onPress={load} variant='secondary' className='mt-2' />
        </View>
      )}

      {!loading && card && (
        <View className='flex-1 pb-24'>
          <Text className='text-primary-100 opacity-40 text-sm mb-3'>
            {index + 1} / {cards.length}
          </Text>

          <Pressable
            onPress={() => { if (!revealed) setRevealed(true); }}
            className='rounded-2xl border border-primary-200 bg-primary-800 p-6 mb-4 relative'
            style={{ minHeight: cardMinHeight }}
          >
            <View className='absolute top-4 right-4'>
              <RatingProgress rating={card.rating} size='md' />
            </View>

            <View className='items-center justify-center flex-1 pt-4 gap-3'>
              <Text className='text-primary-100 text-4xl font-semibold text-center'>
                {card.word}
              </Text>
              {card.transcription ? (
                <Text className='text-primary-100 opacity-60 text-xl text-center'>
                  {card.transcription}
                </Text>
              ) : null}
            </View>

            {revealed && (
              <View className='border-t border-primary-200 mt-4 pt-4 gap-2'>
                <Text className='text-accent-500 text-2xl text-center font-medium'>
                  {card.translation}
                </Text>
                {card.examples.length > 0 && (
                  <ScrollView
                    className='mt-2'
                    showsVerticalScrollIndicator={false}
                    style={{ maxHeight: examplesMaxHeight }}
                  >
                    {card.examples.map((sentence, i) => (
                      <Text key={i} className='text-primary-100 opacity-70 text-base py-1'>
                        — {sentence}
                      </Text>
                    ))}
                  </ScrollView>
                )}
              </View>
            )}

            {!revealed && (
              <Text className='text-primary-100 opacity-30 text-sm text-center mt-4'>
                Нажмите, чтобы открыть перевод
              </Text>
            )}
          </Pressable>
        </View>
      )}

      {!loading && card && (
        <View style={{ position: 'absolute', left: 20, right: 20, bottom: 8, zIndex: 20, elevation: 20 }}>
          {revealed ? (
            <View className='flex-row gap-3'>
              <Button title='Не знаю' onPress={() => handleAnswer(-1)} variant='danger' className='flex-1' />
              <Button title='Знаю' onPress={() => handleAnswer(1)} variant='success' className='flex-1' />
            </View>
          ) : (
            <Button title='Показать перевод' onPress={() => setRevealed(true)} />
          )}
        </View>
      )}
    </View>
  );
}
