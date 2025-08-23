import { FlatList, StyleSheet, Text, View } from 'react-native'
import React, { FC } from 'react'
import { TCard } from '@/types/TCard'

interface ICardProps {
  card: TCard,
}

const FrontCard: FC<ICardProps> = ({card}) => {
  return (
    <View className='bg-primary-800 h-[80%] border border-primary-200 mt-6 mx-5 rounded-xl'>
      <View className='flex flex-col justify-center items-center gap-6 mt-10 px-6'>
        <Text className='text-primary-100 text-4xl'>
          {card.word}
        </Text>
        <Text className='text-primary-100 text-2xl opacity-80'>
          /stɪk/
        </Text>
        <Text className='text-primary-100 text-xl opacity-90 text-center'>
          to limit yourself to doing or using one particular thing and not change to anything else
        </Text>
      </View>

      <FlatList
        className='border-t border-primary-200 mt-5 p-4'
        data={card.examples}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <Text className='text-primary-100 opacity-90 text-lg py-2'>- {item.sentence}</Text>
        )}
      />  
    </View>
  )
}

export default FrontCard;
