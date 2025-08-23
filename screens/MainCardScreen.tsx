import { View } from 'react-native'
import React, { useState } from 'react'
import SearchInput from '@/components/ui/SearchInput';
import { CardModel } from '@/models/CardModel';
import { TCard } from '@/types/TCard';
import FlipCardNavigator from '@/components/card/FlipCardNavigator';

const MainCardScreen = () => {
  const [search, setSearch] = useState('')
  const [card, setCard] = useState<TCard | null>(null)

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
