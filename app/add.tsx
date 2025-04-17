import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Button, FlatList, Text, TextInput, View } from 'react-native';
import { CardModel } from '@/models/CardModel';

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
    const examplesSentence = [];

    for (const sentence of examples) {
      examplesSentence.push(sentence);
    }

    await CardModel.create(
      word,
      translation,
      examplesSentence
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

      <Button title="Save" onPress={save} />
    </View>
  );
}
