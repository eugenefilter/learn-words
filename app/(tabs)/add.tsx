import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useState, useCallback, useEffect } from 'react';
import { FlatList, Text, View, KeyboardAvoidingView, Platform, Pressable } from 'react-native';
import { CardModel } from '@/models/CardModel';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { IconSymbol } from '@/components/ui/IconSymbol';
import Toast from '@/components/ui/Toast';
import { useAppContext } from '@/context/AppContext';
import DictionaryPicker from '@/components/library/DictionaryPicker';
import { DictionaryModel } from '@/models/DictionaryModel';


export default function AddCard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { currentDictionaryId, setCurrentDictionaryId } = useAppContext();
  const [dictionaryName, setDictionaryName] = useState<string>('');
  const [word, setWord] = useState('');
  const [translation, setTranslation] = useState('');
  const [transcription, setTranscription] = useState('');
  const [examples, setExamples] = useState<string[]>([]);
  const [example, setExample] = useState('');
  const [validationVisible, setValidationVisible] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');
  const [saving, setSaving] = useState(false);
  const [confirmRemoveVisible, setConfirmRemoveVisible] = useState(false);
  const [removeIndex, setRemoveIndex] = useState<number | null>(null);
  const [pickerVisible, setPickerVisible] = useState(false);

  // Ensure a fresh form each time the screen is focused
  useFocusEffect(
    useCallback(() => {
      setWord('');
      setTranslation('');
      setTranscription('');
      setExamples([]);
      setExample('');
    }, [])
  );

  // load dictionary name for display
  useEffect(() => {
    let active = true;
    const loadName = async () => {
      if (currentDictionaryId) {
        const dict = await DictionaryModel.findById(currentDictionaryId);
        if (active) setDictionaryName(dict?.name || '');
      } else {
        if (active) setDictionaryName('');
      }
    };
    loadName();
    return () => { active = false };
  }, [currentDictionaryId]);

  const addExample = () => {
    if (example.trim()) {
      setExamples([...examples, example]);
      setExample('');
    }
  };

  const save = async () => {
    if (saving) return;
    if (!word.trim() || !translation.trim()) {
      setValidationVisible(true);
      return;
    }
    if (!currentDictionaryId) {
      setToastType('error');
      setToastMessage('Не выбран словарь по умолчанию');
      setToastVisible(true);
      return;
    }

    const examplesSentence = [] as string[];
    for (const sentence of examples) {
      if (sentence.trim()) examplesSentence.push(sentence.trim());
    }

    try {
      setSaving(true);
      await CardModel.create(
        word.trim(),
        translation.trim(),
        transcription.trim() || null,
        examplesSentence,
        0,
        currentDictionaryId,
      );
      // Clear form fields after successful save
      setWord('');
      setTranslation('');
      setTranscription('');
      setExamples([]);
      setExample('');
      setToastType('success');
      setToastMessage('Карточка сохранена');
      setToastVisible(true);
      setTimeout(() => router.replace('/'), 600);
    } catch (e) {
      setSaving(false);
      setToastType('error');
      const msg = e instanceof Error ? e.message : String(e);
      setToastMessage('Не удалось сохранить: ' + msg);
      setToastVisible(true);
    }
  };

  return (
    <KeyboardAvoidingView className='flex-1 bg-primary-900' behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View className='flex-1 px-5 pt-6 pb-24' style={{ paddingBottom: (tabBarHeight || 0) + insets.bottom + 96 }}>
        <View>
          <Pressable onPress={() => setPickerVisible(true)} className='mb-3 px-3 py-3 rounded-xl border border-primary-200 bg-primary-300'>
            <Text className='text-primary-100'>Словарь: {dictionaryName || (currentDictionaryId ? `#${currentDictionaryId}` : 'не выбран')}</Text>
            <Text className='text-primary-100 opacity-80 text-xs mt-1'>Нажмите, чтобы выбрать</Text>
          </Pressable>
          <Input value={word} onChangeText={setWord} placeholder='Слово (например: stick)' className='my-2' />

          <Input value={translation} onChangeText={setTranslation} placeholder='Перевод (например: придерживаться)' className='my-2' />

          <Input value={transcription} onChangeText={setTranscription} placeholder='Транскрипция (например: /stɪk/)' className='my-2' />

          <Input value={example} onChangeText={setExample} placeholder='Пример предложения (например: Stick to the plan.)' className='my-2' />

          <Button title="Добавить пример" onPress={addExample} variant='secondary' className='w-full mt-2' />
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
        <Button title={saving ? 'Сохранение…' : 'Сохранить'} disabled={saving} onPress={() => save()} className='w-full' />
      </View>

      <ConfirmDialog
        visible={validationVisible}
        title='Заполните поля'
        message='Укажите слово и перевод.'
        confirmText='Понятно'
        showCancel={false}
        onCancel={() => setValidationVisible(false)}
        onConfirm={() => setValidationVisible(false)}
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

      <Toast
        visible={toastVisible}
        message={toastMessage}
        type={toastType}
        position='top'
        onHide={() => setToastVisible(false)}
      />

      <DictionaryPicker
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelect={(id) => {
          setCurrentDictionaryId(id)
        }}
      />
    </KeyboardAvoidingView>
  );
}
