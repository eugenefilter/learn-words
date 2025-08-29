import { useRouter, useFocusEffect } from 'expo-router'
import { useState, useCallback, useEffect } from 'react'
import { View } from 'react-native'
import { FlatList } from 'react-native'
import { CardModel } from '@/models/CardModel'
import { TCard } from '@/types/TCard'
import Card from '@/components/card/Card'
import SearchInput from '@/components/ui/SearchInput'
import useDebounce from '@/utils/useDebounce'
import ConfirmDialog from '@/components/ui/ConfirmDialog'

const CardListScreen = () => {
  const router = useRouter()
  const [cards, setCards] = useState<TCard[]>([])
  const [search, setSearch] = useState('')
  const [confirmVisible, setConfirmVisible] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null)

  const loadCards = async () => {    
    setCards(await CardModel.all());
  }

  const findCards = async (value: string) => {  
    console.log(value) 
    const result = await CardModel.find(value) 

    if (result !== null) setCards(result)
  };

  const requestDelete = (id: number) => {
    setPendingDeleteId(id)
    setConfirmVisible(true)
  }

  const confirmDelete = async () => {
    if (pendingDeleteId === null) return
    await CardModel.delete(pendingDeleteId)
    setConfirmVisible(false)
    setPendingDeleteId(null)
    loadCards() // обновим список
  }

  useFocusEffect(
    useCallback(() => {
      loadCards();
    }, [])
  )

  const debouncedSearch = useDebounce(search, 500)

  useEffect(() => {
    findCards(debouncedSearch)
  }, [debouncedSearch])

  return (
    <View className='bg-primary-900'>
      {/* <TouchableOpacity 
        className='w-full rounded py-5'
        onPress={() => router.push('/add')}
      >
        <Text className=' text-2xl font-bold text-center'>Add Card</Text>
      </TouchableOpacity> */}
      <SearchInput 
        value={search}
        placeholder="Search word ..."
        onChangeText={setSearch}
      />

      <FlatList
        data={cards}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <Card 
            card={item}
            onDelete={requestDelete}
            onEdit={(id) => router.push({ pathname: '/edit', params: { id: id.toString() } })}
            onPress={() => router.push({ pathname: '/card', params: { id: item.id.toString() } })}
          />
        )}
      />

      <ConfirmDialog
        visible={confirmVisible}
        title='Удалить карточку'
        message='Вы уверены, что хотите удалить эту карточку?'
        confirmText='Удалить'
        cancelText='Отмена'
        onCancel={() => { setConfirmVisible(false); setPendingDeleteId(null) }}
        onConfirm={confirmDelete}
      />
    </View>
  );
}

export default CardListScreen;
