import { View } from 'react-native'
import React, { useEffect, useState } from 'react'
import SearchInput from '@/components/ui/SearchInput';
import { CardModel } from '@/models/CardModel';
import { TCard } from '@/types/TCard';
import FlipCardNavigator from '@/components/card/FlipCardNavigator';
import { useLocalSearchParams } from 'expo-router';

const MainCardScreen = () => {
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
      }    
    }
  }

  const handleSwipeRight = async () => {
    if (card !== null) {
      const next = await CardModel.nextCard(card.id)
      console.log(next)
      if (next !== null) {
        setCard(next)
      }
    }
  }

  return (
    <View className='bg-primary-900'>
      <SearchInput 
        value={search}
        placeholder="Search word ..."
        onChangeText={searchCardHandler}
      />

      {card && (
      <FlipCardNavigator 
          card={card} 
          onSwipeLeft={handleSwipeLeft} 
          onSwipeRight={handleSwipeRight} 
      />)}
    </View>
  )
}

export default MainCardScreen;
