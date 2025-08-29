import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { FlatList, Text, View, KeyboardAvoidingView, Platform } from 'react-native';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { CardModel } from '@/models/CardModel';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

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

  useEffect(() => {
    if (params?.id && typeof params.id === 'string') {
      const fetch = async () => {
        const card = await CardModel.findById(parseInt(params.id as string, 10));
        if (card) {
          setWord(card.word);
          setTranslation(card.translation);
          setTranscription(card.transcription || '');
          setExamples(card.examples.map(e => e.sentence));
        }
      };
      fetch();
    }
  }, []);

  const addExample = () => {
    if (example.trim()) {
      setExamples([...examples, example]);
      setExample('');
    }
  };

  const update = async () => {
    await CardModel.update(
      parseInt(params.id as string, 10),
      word,
      translation,
      transcription.trim() || null,
      examples
    );
    router.replace('/');
  };

  return (
    <KeyboardAvoidingView className='flex-1 bg-primary-900' behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View className='flex-1 px-5 pt-6 pb-24' style={{ paddingBottom: (tabBarHeight || 0) + insets.bottom + 96 }}>
        <View>
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
            renderItem={({ item }) => <Text className='text-primary-100 opacity-90 my-1'>– {item}</Text>}
          />
        </View>
      </View>
      <View style={{ position: 'absolute', left: 20, right: 20, bottom: (tabBarHeight || 0) + insets.bottom + 12 }}>
        <Button title="Сохранить изменения" onPress={update} className='w-full' />
      </View>
    </KeyboardAvoidingView>
  );
}
