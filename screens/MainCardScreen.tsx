import { Pressable, View, Text } from 'react-native'
import React, { useEffect, useState } from 'react'
import SearchInput from '@/components/ui/SearchInput';
import { CardModel } from '@/models/CardModel';
import { TCard } from '@/types/TCard';
import FlipCardNavigator from '@/components/card/FlipCardNavigator';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/IconSymbol';
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { useAppContext } from '@/context/AppContext'

const MainCardScreen = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { currentDictionaryId } = useAppContext();
  const [search, setSearch] = useState('')
  const [card, setCard] = useState<TCard | null>(null)
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [confirmVisible, setConfirmVisible] = useState(false)

  useEffect(() => {
    const loadById = async () => {
      if (id && typeof id === 'string') {
        const found = await CardModel.findById(parseInt(id, 10))
        if (found) {
          setCard(found)
          // Не перезаписываем ввод пользователя, если он уже что-то печатал
          setSearch((prev) => (prev && prev.length > 0 ? prev : found.word))
        }
      } else {
        // Если пришли без id (вкладка открыта напрямую) — подгрузим первую карточку
        const first = await CardModel.firstCard(currentDictionaryId || undefined)
        if (first) {
          setCard(first)
          setSearch((prev) => (prev && prev.length > 0 ? prev : first.word))
        }
      }
    }
    loadById()
  }, [id])

  const searchCardHandler = async (text: string) => {
    setSearch(text)
    const searchResult = await CardModel.findByWord(text, currentDictionaryId || undefined)
    setCard(searchResult)
  }

  const handleSwipeLeft = async () => {
    if (card !== null) {
      const prev = await CardModel.prevCard(card.id, currentDictionaryId || undefined)
      if (prev !== null) {
        setCard(prev)
      } else {
        const last = await CardModel.lastCard(currentDictionaryId || undefined)
        if (last) setCard(last)
      }    
    }
  }

  const handleSwipeRight = async () => {
    if (card !== null) {
      const next = await CardModel.nextCard(card.id, currentDictionaryId || undefined)
      if (next !== null) {
        setCard(next)
      } else {
        const first = await CardModel.firstCard(currentDictionaryId || undefined)
        if (first) setCard(first)
      }
    }
  }

  const handleEdit = () => {
    if (!card) return;
    router.push({ pathname: '/edit', params: { id: card.id.toString() } });
  }

  const handleDelete = () => {
    if (!card) return;
    setConfirmVisible(true)
  }

  const confirmDelete = async () => {
    if (!card) return
    const currentId = card.id
    await CardModel.delete(currentId)
    setConfirmVisible(false)
    const next = await CardModel.nextCard(currentId, currentDictionaryId || undefined)
    if (next) {
      setCard(next)
      setSearch(next.word)
      return
    }
    const prev = await CardModel.prevCard(currentId, currentDictionaryId || undefined)
    if (prev) {
      setCard(prev)
      setSearch(prev.word)
      return
    }
    setCard(null)
    setSearch('')
  }

  return (
    <View className='bg-primary-900 flex-1 relative'>
      <View className='px-4 pt-3 flex-row items-center justify-between'>
        <Text className='text-primary-100 text-lg'>Карточка</Text>
        <Pressable onPress={() => router.push('/csv')} className='px-3 py-2 rounded-xl border border-primary-300'>
          <Text className='text-primary-100 text-xs'>CSV</Text>
        </Pressable>
      </View>
      <SearchInput 
        value={search}
        placeholder="Search word ..."
        onChangeText={searchCardHandler}
      />

      <View className='flex-1'>
        {card && (
          <FlipCardNavigator 
            card={card} 
            onSwipeLeft={handleSwipeLeft} 
            onSwipeRight={handleSwipeRight} 
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}
      </View>

      <ConfirmDialog 
        visible={confirmVisible}
        title='Удалить карточку'
        message='Вы уверены, что хотите удалить эту карточку?'
        confirmText='Удалить'
        cancelText='Отмена'
        onCancel={() => setConfirmVisible(false)}
        onConfirm={confirmDelete}
      />

      {card && (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: insets.bottom + 70 }} className='px-4'>
          <View className='flex-row items-center justify-between gap-4'>
            <Pressable 
              onPress={handleSwipeLeft} 
              className='flex-1 rounded-2xl flex-row items-center justify-center border border-primary-200'
              style={{ aspectRatio: 2 }}
            >
              <IconSymbol name='chevron.left' size={30} color={'#d9ebeb'} />
              <Text className='text-primary-100 text-2xl ml-3 h-48'>Назад</Text>
            </Pressable>
            <Pressable 
              onPress={handleSwipeRight} 
              className='flex-1 rounded-2xl flex-row items-center justify-center bg-primary-300' 
              style={{ aspectRatio: 2 }}
            >
              <Text className='text-white text-2xl mr-3 h-48'>Далее</Text>
              <IconSymbol name='chevron.right' size={30} color={'#ffffff'} />
            </Pressable>
          </View>
        </View>
      )}
    </View>
  )
}

export default MainCardScreen;
