import { useEffect, useState } from 'react';
import { Button, Text, View } from 'react-native';
import { getDB } from '../../database/database';

type Card = {
  id: number;
  word: string;
  translation: string;
  level: number;
  examples: string[];
};

export default function RepeatScreen() {
  const [cards, setCards] = useState<Card[]>([]);
  const [index, setIndex] = useState(0);
  const [show, setShow] = useState(false);

  const load = async () => {
    const db = getDB();
    const result = await db.getAllAsync<Card>('SELECT * FROM cards WHERE level <= 3');
    
    const cardsWithExamples = await Promise.all(
      result.map(async (card) => {
        const examples = await db.getAllAsync<{ sentence: string }>(
          'SELECT sentence FROM examples WHERE card_id = ?',
          [card.id]
        );
        return {
          ...card,
          examples: examples.map(e => e.sentence)
        };
      })
    );
    
    setCards(cardsWithExamples);
  };

  useEffect(() => {
    load();
  }, []);

  if (cards.length === 0) return <Text style={{ padding: 16 }}>No cards to repeat</Text>;

  const card = cards[index];

  const updateLevel = async (delta: number) => {
    const db = getDB();
    const newLevel = Math.max(0, Math.min(5, card.level + delta));
    await db.runAsync('UPDATE cards SET level = ? WHERE id = ?', [newLevel, card.id]);
    next();
  };

  const next = () => {
    setShow(false);
    setIndex((index + 1) % cards.length);
  };

  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 24 }}>{card.word}</Text>

      {show && (
        <View style={{ marginTop: 16 }}>
          <Text>{card.translation}</Text>
          <Text style={{ fontWeight: 'bold' }}>Examples:</Text>
          {card.examples.map((e, i) => (
            <Text key={i}>– {e}</Text>
          ))}
        </View>
      )}

      <Button title={show ? 'Next' : 'Show Answer'} onPress={show ? next : () => setShow(true)} />
      {show && (
        <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 16 }}>
          <Button title="Forgot" onPress={() => updateLevel(-1)} />
          <Button title="Remembered" onPress={() => updateLevel(+1)} />
        </View>
      )}
    </View>
  );
}
