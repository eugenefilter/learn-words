import { View } from 'react-native'
import React, { useState } from 'react'
import SearchInput from '@/components/ui/SearchInput';
import { FlipCard } from '@/components/card/FlipCard';
import BackCard from '@/components/card/BackCard';
import FrontCard from '@/components/card/FrontCard';

const MainCardScreen = () => {
  const [search, setSearch] = useState('')

  return (
    <View className='bg-primary-900'>
      <SearchInput 
        value={search}
        placeholder="Search word ..."
        onChangeText={setSearch}
      />

      <FlipCard 
        front={<FrontCard card={{
          id: 1,
          word: 'to stick to something',
          translation: 'придерживаться чего лидо',
          examples: [
            {id: 1, sentence: 'Could you stick to the point, please?'},
            {id: 2, sentence: 'If you make a promise, you should stick to it'},
            {id: 3, sentence: 'I think I`ll stick to my first plan'}
          ],
          show: true
        }}
        />}

        back={<BackCard card={{
          id: 1,
          word: 'to stick to something',
          translation: 'придерживаться чего лидо',
          examples: [],
          show: true
        }}
        />}
      />
    </View>
  )
}

export default MainCardScreen;