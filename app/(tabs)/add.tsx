import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Button, FlatList, Text, View } from 'react-native';
import { CardModel } from '@/models/CardModel';
import { Form } from '@/components/form';

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
    console.log('save')
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
    <View className='h-full p-5'>
      <Form.Input value={word} onChangeText={setWord} placeholder='Word' className='my-2'/>

      <Form.Input value={translation} onChangeText={setTranslation} placeholder='Translation' className='my-2' />

      <Form.Input value={example} onChangeText={setExample} placeholder='Example' className='my-2' />
      
      <Button title="Add Example" onPress={addExample} />

      <FlatList
        data={examples}
        keyExtractor={(item, i) => i.toString()}
        renderItem={({ item }) => <Text>– {item}</Text>}
      />

      <Form.Button title="Save" onPress={() => save()} className='mb-10'/>

    </View>
  );
}
