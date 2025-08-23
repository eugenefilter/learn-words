import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { FlatList, Text, TextInput, View } from 'react-native';
import Button from '@/components/ui/Button';
import { CardModel } from '@/models/CardModel';

export default function EditCard() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [word, setWord] = useState('');
  const [translation, setTranslation] = useState('');
  const [examples, setExamples] = useState<string[]>([]);
  const [example, setExample] = useState('');

  useEffect(() => {
    if (params?.id && typeof params.id === 'string') {
      const fetch = async () => {
        const card = await CardModel.findById(parseInt(params.id));
        if (card) {
          setWord(card.word);
          setTranslation(card.translation);
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
      parseInt(params.id as string),
      word,
      translation,
      examples
    );
    router.replace('/');
  };

  return (
    <View style={{ padding: 16 }}>
      <Text style={{ color: '#d9ebeb', marginBottom: 4 }}>Слово</Text>
      <TextInput value={word} onChangeText={setWord} placeholder='Слово (например: stick)' placeholderTextColor={'#9fbfbf'} style={{ borderWidth: 1, borderColor: '#204444', color: '#fff', padding: 12, borderRadius: 8, marginBottom: 8 }} />

      <Text style={{ color: '#d9ebeb', marginBottom: 4 }}>Перевод</Text>
      <TextInput value={translation} onChangeText={setTranslation} placeholder='Перевод (например: придерживаться)' placeholderTextColor={'#9fbfbf'} style={{ borderWidth: 1, borderColor: '#204444', color: '#fff', padding: 12, borderRadius: 8, marginBottom: 8 }} />

      <Text style={{ color: '#d9ebeb', marginBottom: 4 }}>Пример</Text>
      <TextInput value={example} onChangeText={setExample} placeholder='Пример предложения (например: Stick to the plan.)' placeholderTextColor={'#9fbfbf'} style={{ borderWidth: 1, borderColor: '#204444', color: '#fff', padding: 12, borderRadius: 8, marginBottom: 8 }} />
      <Button title="Добавить пример" onPress={addExample} variant='secondary' />

      <FlatList
        data={examples}
        keyExtractor={(item, i) => i.toString()}
        renderItem={({ item }) => <Text>– {item}</Text>}
      />

      <Button title="Сохранить изменения" onPress={update} />
    </View>
  );
}
