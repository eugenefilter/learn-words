import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, FlatList, Text, View } from 'react-native';
import { CardModel } from '@/models/CardModel';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';


export default function AddCard() {
  const router = useRouter();
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
    <View className='h-full p-5 bg-primary-900'>
      <Input value={word} onChangeText={setWord} placeholder='Слово (например: stick)' className='my-2'/>

      <Input value={translation} onChangeText={setTranslation} placeholder='Перевод (например: придерживаться)' className='my-2' />

      <Input value={example} onChangeText={setExample} placeholder='Пример предложения (например: Stick to the plan.)' className='my-2' />
      
      <Button title="Добавить пример" onPress={addExample} variant='secondary' />

      <FlatList
        data={examples}
        keyExtractor={(item, i) => i.toString()}
        renderItem={({ item }) => <Text className='text-primary-100 my-1'>– {item}</Text>}
      />

      <Button title="Сохранить" onPress={() => save()} />

    </View>
  );
}
