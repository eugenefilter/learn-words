import { FlatList, Text, View } from 'react-native'
import React, { FC } from 'react'
import { TCard } from '@/types/TCard'
import RatingProgress from '@/components/ui/RatingProgress'

interface ICardProps {
  card: TCard,
}

const FrontCard: FC<ICardProps> = ({card}) => {
  return (
    <View className='bg-primary-800 flex-1 border border-primary-200 mt-6 mx-5 rounded-xl relative overflow-hidden'>
      <View className='absolute top-3 right-3 z-10'>
        <RatingProgress rating={card.rating ?? 0} size='md' />
      </View>
      <View className='flex flex-col justify-center items-center gap-6 mt-10 px-6 pb-5'>
        <Text className='text-primary-100 text-4xl'>
          {card.word}
        </Text>
        {card.transcription ? (
          <Text className='text-primary-100 text-2xl opacity-80'>
            {card.transcription}
          </Text>
        ) : null}
        {card.explanation ? (
          <Text className='text-primary-100 text-xl opacity-90 text-center'>
            {card.explanation}
          </Text>
        ) : null}
      </View>

      <View className='flex-1 border-t border-primary-200 mt-2'>
        <FlatList
          className='px-4 pt-2'
          contentContainerStyle={{ paddingBottom: 12 }}
          data={card.examples}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <Text className='text-primary-100 opacity-90 text-lg py-2'>- {item.sentence}</Text>
          )}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </View>
  )
}

export default FrontCard;
