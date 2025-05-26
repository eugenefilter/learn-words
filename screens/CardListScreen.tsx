import { useRouter, useFocusEffect } from 'expo-router'
import { useState, useCallback, useEffect } from 'react'
import { Alert } from 'react-native'
import { FlatList } from 'react-native'
import { CardModel } from '@/models/CardModel'
import { TCard } from '@/types/TCard'
import Card from '@/components/card/Card'
import SearchInput from '@/components/ui/SearchInput'
import useDebounce from '@/utils/useDebounce'

const CardListScreen = () => {
  const router = useRouter()
  const [cards, setCards] = useState<TCard[]>([])
  const [search, setSearch] = useState('')

  const loadCards = async () => {    
    setCards(await CardModel.all());
  }

  const findCards = async (value: string) => {  
    console.log(value) 
    const result = await CardModel.find(value) 

    if (result !== null) setCards(result)
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
  }

  useFocusEffect(
    useCallback(() => {
      loadCards();
    }, [])
  )

  const debouncedSearch = useDebounce(search, 500)

  useEffect(() => {
    findCards(search)
  }, [debouncedSearch])

  return (
    <>
      {/* <TouchableOpacity 
        className='w-full rounded py-5'
        onPress={() => router.push('/add')}
      >
        <Text className=' text-2xl font-bold text-center'>Add Card</Text>
      </TouchableOpacity> */}
      <SearchInput 
        value={search}
        placeholder="Search word ..."
        handleChangeText={setSearch}
      />

      <FlatList
        data={cards}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <Card 
            card={item}
            onDelete={deleteCard}
            onEdit={(id) => router.push({ pathname: '/edit', params: { id: id.toString() } })}
          />
          // <FlipCard 
          //   front={
          //     <Card
          //       card={item}
          //       onDelete={deleteCard}
          //       onEdit={(id) => router.push({ pathname: '/edit', params: { id: id.toString() } })}
          //    />
          //   }
          //   back={
          //     <View className='w-full min-h-30 max-h-30'>
          //       <Text className='text-primary-900'>{item.translation}</Text>
          //       <Text className='text-primary-900'>Examples:</Text>
          //       {item.examples.map((ex, i) => (
          //         <Text className='text-primary-900' key={i}>– {ex.sentence}</Text>
          //       ))}
          //     </View>              
          //   }
          // />
        )}
      />
    </>
  );
}

export default CardListScreen;

