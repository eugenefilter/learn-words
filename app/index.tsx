import { useRouter, useFocusEffect } from 'expo-router'
import { useState, useCallback } from 'react'
import { Alert } from 'react-native'
import { FlatList, Text, TouchableOpacity, View, Button, StyleSheet } from 'react-native'
import { CardModel } from '@/models/CardModel'
import { TCard } from '@/types/TCard'
import Card from '@/components/card/card'

const HomeScreen = () => {
  const router = useRouter();
  const [cards, setCards] = useState<TCard[]>([]);

  const loadCards = async () => {
    const result = await CardModel.all();
    
    setCards(result);
  };

  const deleteCard = async (id: number) => {
    Alert.alert(
      'Подтвердите удаление',
      'Вы уверены, что хотите удалить эту карточку?',
      [
        {
          text: 'Отмена',
          style: 'cancel',
          // Ничего не делаем, просто закрывается диалог
        },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            await CardModel.delete(id);
            loadCards(); // обновим список
          }
        }
      ]
    )
  };

  useFocusEffect(
    useCallback(() => {
      loadCards();
    }, [])
  );

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <Button title="Add Card" onPress={() => router.push('/add')} />
      <Button title="Repeat Mode" onPress={() => router.push('/repeat')} />

      <FlatList
        data={cards}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => {
              item.show = !item.show;
              setCards([...cards]);
            }}
            style={{ paddingVertical: 10, borderBottomWidth: 1 }}
          >
            <Card 
              card={item}
              onDelete={(id) => deleteCard(id)}
              onEdit={(id) => router.push({ pathname: '/edit', params: { id: id.toString() } })}
            />
            {item.show && (
              <View style={{ marginTop: 8 }}>
                <Text style={{ fontStyle: 'italic' }}>{item.translation}</Text>
                <Text style={{ fontWeight: 'bold' }}>Examples:</Text>
                {item.examples.map((ex, i) => (
                  <Text key={i}>– {ex.sentence}</Text>
                ))}
              </View>
            )}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    alignContent: "center"
  },

  gap: {
    gap: 4
  }
});

export default HomeScreen;
