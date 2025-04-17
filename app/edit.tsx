import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { Button, FlatList, Text, TextInput, View } from 'react-native';
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
        const card = await CardModel.find(parseInt(params.id));
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
      <Text>Word</Text>
      <TextInput value={word} onChangeText={setWord} style={{ borderWidth: 1, marginBottom: 8 }} />

      <Text>Translation</Text>
      <TextInput value={translation} onChangeText={setTranslation} style={{ borderWidth: 1, marginBottom: 8 }} />

      <Text>Example</Text>
      <TextInput value={example} onChangeText={setExample} style={{ borderWidth: 1, marginBottom: 8 }} />
      <Button title="Add Example" onPress={addExample} />

      <FlatList
        data={examples}
        keyExtractor={(item, i) => i.toString()}
        renderItem={({ item }) => <Text>– {item}</Text>}
      />

      <Button title="Update Card" onPress={update} />
    </View>
  );
}
