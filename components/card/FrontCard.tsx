import { FlatList, Text, View, Pressable } from 'react-native'
import React, { FC } from 'react'
import { TCard } from '@/types/TCard'
import { Pencil, Trash } from 'lucide-react-native'
import RatingProgress from '@/components/ui/RatingProgress'

interface ICardProps {
  card: TCard,
  onEdit?: () => void,
  onDelete?: () => void,
}

const FrontCard: FC<ICardProps> = ({card, onEdit, onDelete}) => {
  return (
    <View className='bg-primary-800 flex-1 border border-primary-200 mt-6 mx-5 rounded-xl relative overflow-hidden'>
      <View className='absolute top-3 right-3 z-10'>
        <RatingProgress rating={card.rating ?? 0} size='md' />
      </View>
      {(onEdit || onDelete) && (
        <View className='absolute top-16 right-3 z-10 flex-row gap-2'>
          {onEdit && (
            <Pressable onPress={onEdit} className='w-10 h-10 items-center justify-center rounded-full border border-primary-300'>
              <Pencil color={'#d9ebeb'} size={20} />
            </Pressable>
          )}
          {onDelete && (
            <Pressable onPress={onDelete} className='w-10 h-10 items-center justify-center rounded-full border border-primary-300'>
              <Trash color={'#ef4444'} size={20} />
            </Pressable>
          )}
        </View>
      )}
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
