import { useRouter, useFocusEffect } from 'expo-router'
import { useState, useCallback } from 'react'
import { Alert } from 'react-native'
import { FlatList, Text, TouchableOpacity, View } from 'react-native'
import { CardModel } from '@/models/CardModel'
import { TCard } from '@/types/TCard'
import Card from '@/components/card/card'
import { FlipCard } from '@/components/card/flipCard'

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
    <View className='p-5 flex-1'>
      <TouchableOpacity 
        className='w-full rounded py-5'
        onPress={() => router.push('/add')}
      >
        <Text className=' text-2xl font-bold text-center'>Add Card</Text>
      </TouchableOpacity>

      <FlatList
        data={cards}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <FlipCard 
            front={
              <Card
                card={item}
                onDelete={deleteCard}
                onEdit={(id) => router.push({ pathname: '/edit', params: { id: id.toString() } })}
              />
            }
            back={
             <View className='w-full min-h-30 max-h-30'>
               <Text className='text-primary-900'>{item.translation}</Text>
               <Text className='text-primary-900'>Examples:</Text>
               {item.examples.map((ex, i) => (
                 <Text className='text-primary-900' key={i}>– {ex.sentence}</Text>
               ))}
             </View>              
            }
          />
        )}
      />
    </View>
  );
}

export default HomeScreen;
