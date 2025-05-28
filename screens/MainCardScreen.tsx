import { View } from 'react-native'
import React, { useState } from 'react'
import SearchInput from '@/components/ui/SearchInput';
import { FlipCard } from '@/components/card/FlipCard';
import BackCard from '@/components/card/BackCard';
import FrontCard from '@/components/card/FrontCard';
import { CardModel } from '@/models/CardModel';
import { TCard } from '@/types/TCard';

const MainCardScreen = () => {
  const [search, setSearch] = useState('')
  const [card, setCard] = useState<TCard | null>(null)

  const searchCardHandler = async (text: string) => {
    setSearch(text)
    const searchResult = await CardModel.findByWord(text)
    setCard(searchResult)
    console.log(search)
  }

  return (
    <View className='bg-primary-900'>
      <SearchInput 
        value={search}
        placeholder="Search word ..."
        onChangeText={searchCardHandler}
      />

      {card && (
      <FlipCard 
        front={<FrontCard card={card} />}

        back={<BackCard card={card} />}
      />)}
    </View>
  )
}

export default MainCardScreen;