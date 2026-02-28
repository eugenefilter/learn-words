import { Text, View } from 'react-native'
import React, { FC } from 'react'
import { TCard } from '@/types/TCard'
import RatingProgress from '@/components/ui/RatingProgress'

interface ICardProps {
  card: TCard,
}

const BackCard: FC<ICardProps> = ({card}) => {
  return (
    <View className='bg-primary-800 flex-1 border border-primary-200 mt-6 mx-5 rounded-xl flex items-center justify-center px-6 relative overflow-hidden'>
      <View className='absolute top-3 right-3 z-10'>
        <RatingProgress rating={card.rating ?? 0} size='md' />
      </View>
      <Text className='text-primary-100 text-4xl text-center'>
        {card.translation}
      </Text>
    </View>
  )
}

export default BackCard;
