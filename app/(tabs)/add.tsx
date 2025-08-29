import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, FlatList, Text, View, KeyboardAvoidingView, Platform } from 'react-native';
import { CardModel } from '@/models/CardModel';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';


export default function AddCard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const [word, setWord] = useState('');
  const [translation, setTranslation] = useState('');
  const [examples, setExamples] = useState<string[]>([]);
  const [example, setExample] = useState('');

  const addExample = () => {
    if (example.trim()) {
      setExamples([...examples, example]);
      setExample('');
    }
  };

  const save = async () => {
    if (!word.trim() || !translation.trim()) {
      Alert.alert('Заполните поля', 'Укажите слово и перевод.');
      return;
    }

    const examplesSentence = [] as string[];
    for (const sentence of examples) {
      if (sentence.trim()) examplesSentence.push(sentence.trim());
    }

    await CardModel.create(
      word.trim(),
      translation.trim(),
      examplesSentence
    );
    
    router.replace('/');
  };

  return (
    <KeyboardAvoidingView className='flex-1 bg-primary-900' behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View className='flex-1 px-5 pt-6 pb-24' style={{ paddingBottom: (tabBarHeight || 0) + insets.bottom + 96 }}>
        <View>
          <Input value={word} onChangeText={setWord} placeholder='Слово (например: stick)' className='my-2' />

          <Input value={translation} onChangeText={setTranslation} placeholder='Перевод (например: придерживаться)' className='my-2' />

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
        <Button title="Сохранить" onPress={() => save()} className='w-full' />
      </View>
    </KeyboardAvoidingView>
  );
}
