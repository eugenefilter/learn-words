import { StyleSheet, Text, View } from 'react-native'
import React, { FC } from 'react'
import { TCard } from '@/types/TCard'

interface ICardProps {
  card: TCard,
}

const BackCard: FC<ICardProps> = ({card}) => {
  return (
    <View className='bg-primary-800 h-[64%] border border-primary-200 mt-3 mx-5 rounded-xl flex items-center justify-center px-6'>
      <Text className='text-primary-100 text-4xl text-center'>
        {card.translation}
      </Text>
    </View>
  )
}

export default BackCard;
