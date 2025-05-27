import { FlatList, StyleSheet, Text, View } from 'react-native'
import React, { FC } from 'react'
import { TCard } from '@/types/TCard'

interface ICardProps {
  card: TCard,
}

const FrontCard: FC<ICardProps> = ({card}) => {


  return (
    <View className='bg-primary-900 h-[80%] border border-primary-200 mt-5 mx-5 rounded'>
      <View className='flex flex-col justify-center items-center gap-8 mt-10 px-5'>
        <Text className='text-white text-4xl'>
          {card.word}
        </Text>
        <Text className='text-white text-2xl'>
          /stɪk/
        </Text>
        <Text className='text-white text-2xl'>
          to limit yourself to doing or using one particular thing and not change to anything else
        </Text>
      </View>

      <FlatList
        className='border-t border-primary-200 mt-5 p-5'
        data={card.examples}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <Text className='text-primary-200 text-lg py-2'>- {item.sentence}</Text>
        )}
      />  
    </View>
  )
}

export default FrontCard;