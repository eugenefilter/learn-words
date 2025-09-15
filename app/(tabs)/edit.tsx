import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { FlatList, Text, View, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { CardModel } from '@/models/CardModel';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import Toast from '@/components/ui/Toast';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { IconSymbol } from '@/components/ui/IconSymbol';

export default function EditCard() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();

  const [word, setWord] = useState('');
  const [translation, setTranslation] = useState('');
  const [transcription, setTranscription] = useState('');
  const [examples, setExamples] = useState<string[]>([]);
  const [example, setExample] = useState('');
  const [cardId, setCardId] = useState<number | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');
  const [confirmRemoveVisible, setConfirmRemoveVisible] = useState(false);
  const [removeIndex, setRemoveIndex] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const load = async () => {
        const rawId = params?.id;
        if (!rawId || typeof rawId !== 'string') return;
        const idNum = parseInt(rawId, 10);
        setCardId(idNum);
        const card = await CardModel.findById(idNum);
        if (active && card) {
          setWord(card.word);
          setTranslation(card.translation);
          setTranscription(card.transcription || '');
          setExamples(card.examples.map(e => e.sentence));
          setRating(card.rating ?? 0);
        }
      };
      load();
      return () => { active = false };
    }, [params?.id])
  );

  const addExample = () => {
    if (example.trim()) {
      setExamples([...examples, example]);
      setExample('');
    }
  };

  const update = async () => {
    if (!cardId) return;
    try {
      await CardModel.update(
        cardId,
        word,
        translation,
        transcription.trim() || null,
        examples,
        rating
      );
      setToastType('success');
      setToastMessage('Изменения сохранены');
      setToastVisible(true);
      setTimeout(() => {
        if (cardId) {
          router.replace({ pathname: '/card', params: { id: String(cardId) } });
        } else {
          router.replace('/card');
        }
      }, 600);
    } catch (e) {
      setToastType('error');
      setToastMessage('Не удалось сохранить изменения');
      setToastVisible(true);
    }
  };

  return (
    <KeyboardAvoidingView
      className='flex-1 bg-primary-900'
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={(tabBarHeight || 0) + insets.bottom + 12}
    >
      <View className='flex-1 px-5 pt-6 pb-24' style={{ paddingBottom: (tabBarHeight || 0) + insets.bottom + 96 }}>
        <View>
          <Input value={word} onChangeText={setWord} placeholder='Слово (например: stick)' className='my-2' />

          <Input value={translation} onChangeText={setTranslation} placeholder='Перевод (например: придерживаться)' className='my-2' />

          <Input value={transcription} onChangeText={setTranscription} placeholder='Транскрипция (например: /stɪk/)' className='my-2' />

          <Input value={example} onChangeText={setExample} placeholder='Пример предложения (например: Stick to the plan.)' className='my-2' />

          <Button title="Добавить пример" onPress={addExample} variant='secondary' className='w-full mt-2' />
        </View>

        <View className='mt-5 border-t border-primary-200 pt-4'>
          <Text className='text-primary-100 opacity-90 mb-2'>Уровень знания:</Text>
          <View className='flex-row gap-3'>
            <Pressable onPress={() => setRating(0)} className={`flex-row items-center gap-2 px-3 py-2 rounded-xl border ${rating===0 ? 'bg-primary-700 border-accent-600' : 'border-primary-300'}`}>
              <IconSymbol name="battery.0" color={rating===0 ? '#22c55e' : '#d9ebeb'} size={20} />
              <Text className='text-primary-100'>Не знаю</Text>
            </Pressable>
            <Pressable onPress={() => setRating(1)} className={`flex-row items-center gap-2 px-3 py-2 rounded-xl border ${rating===1 ? 'bg-primary-700 border-accent-600' : 'border-primary-300'}`}>
              <IconSymbol name="battery.50" color={rating===1 ? '#22c55e' : '#d9ebeb'} size={20} />
              <Text className='text-primary-100'>Плохо</Text>
            </Pressable>
            <Pressable onPress={() => setRating(2)} className={`flex-row items-center gap-2 px-3 py-2 rounded-xl border ${rating===2 ? 'bg-primary-700 border-accent-600' : 'border-primary-300'}`}>
              <IconSymbol name="battery.100" color={rating===2 ? '#22c55e' : '#d9ebeb'} size={20} />
              <Text className='text-primary-100'>Хорошо</Text>
            </Pressable>
          </View>
        </View>

        <View className='flex-1 mt-4 border-t border-primary-200 pt-3'>
          <Text className='text-primary-100 opacity-90 mb-2'>Примеры:</Text>
          <FlatList
            data={examples}
            keyExtractor={(item, i) => i.toString()}
            renderItem={({ item, index }) => (
              <View className='flex-row items-center justify-between my-1'>
                <Text className='text-primary-100 opacity-90 flex-1 pr-3'>– {item}</Text>
                <Pressable
                  onPress={() => { setRemoveIndex(index); setConfirmRemoveVisible(true); }}
                  hitSlop={10}
                  className='p-2 rounded-lg'
                >
                  <IconSymbol name="trash.fill" size={20} color={'#d9ebeb'} />
                </Pressable>
              </View>
            )}
          />
        </View>
      </View>
      <View style={{ position: 'absolute', left: 20, right: 20, bottom: (tabBarHeight || 0) + insets.bottom + 12, zIndex: 20, elevation: 20 }}>
        <Button title="Сохранить изменения" onPress={update} className='w-full' />
      </View>
      <Toast
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        position='top'
        onHide={() => setToastVisible(false)}
      />

      <ConfirmDialog
        visible={confirmRemoveVisible}
        title='Удалить пример?'
        message='Это действие нельзя отменить.'
        confirmText='Удалить'
        cancelText='Отмена'
        onCancel={() => { setConfirmRemoveVisible(false); setRemoveIndex(null); }}
        onConfirm={() => {
          if (removeIndex !== null) {
            setExamples(prev => prev.filter((_, i) => i !== removeIndex));
          }
          setConfirmRemoveVisible(false);
          setRemoveIndex(null);
        }}
      />
    </KeyboardAvoidingView>
  );
}
