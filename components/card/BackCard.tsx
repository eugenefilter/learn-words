import { StyleSheet, Text, View } from 'react-native'
import React, { FC } from 'react'
import { TCard } from '@/types/TCard'

interface ICardProps {
  card: TCard,
}

const BackCard: FC<ICardProps> = ({card}) => {
  return (
    <View className='bg-primary-800 h-[64%] border border-primary-200 mt-2.5 mx-5 rounded flex items-center justify-center'>
      <Text className='text-white text-4xl mx-5 text-center'>
        {card.translation}
      </Text>
    </View>
  )
}

export default BackCard;
