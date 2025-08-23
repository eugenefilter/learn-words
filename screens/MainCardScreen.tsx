import { Pressable, View, Text } from 'react-native'
import React, { useEffect, useState } from 'react'
import SearchInput from '@/components/ui/SearchInput';
import { CardModel } from '@/models/CardModel';
import { TCard } from '@/types/TCard';
import FlipCardNavigator from '@/components/card/FlipCardNavigator';
import { useLocalSearchParams } from 'expo-router';
import Button from '@/components/ui/Button';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconSymbol } from '@/components/ui/IconSymbol';

const MainCardScreen = () => {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('')
  const [card, setCard] = useState<TCard | null>(null)
  const { id } = useLocalSearchParams<{ id?: string }>();

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
        const first = await CardModel.firstCard()
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
    const searchResult = await CardModel.findByWord(text)
    setCard(searchResult)
  }

  const handleSwipeLeft = async () => {
    if (card !== null) {
      const prev = await CardModel.prevCard(card.id)
      console.log(prev)
      if (prev !== null) {
        setCard(prev)
      } else {
        const last = await CardModel.lastCard()
        if (last) setCard(last)
      }    
    }
  }

  const handleSwipeRight = async () => {
    if (card !== null) {
      const next = await CardModel.nextCard(card.id)
      console.log(next)
      if (next !== null) {
        setCard(next)
      } else {
        const first = await CardModel.firstCard()
        if (first) setCard(first)
      }
    }
  }

  return (
    <View className='bg-primary-900 flex-1 relative'>
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
          />
        )}
      </View>

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
