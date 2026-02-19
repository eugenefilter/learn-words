import { FlatList, StyleSheet, Text, View, Pressable } from 'react-native'
import React, { FC } from 'react'
import { TCard } from '@/types/TCard'
import { Pencil, Trash } from 'lucide-react-native'
import { IconSymbol } from '@/components/ui/IconSymbol'

interface ICardProps {
  card: TCard,
  onEdit?: () => void,
  onDelete?: () => void,
}

const FrontCard: FC<ICardProps> = ({card, onEdit, onDelete}) => {
  return (
    <View className='bg-primary-800 h-[80%] border border-primary-200 mt-6 mx-5 rounded-xl relative'>
      <View className='absolute top-3 left-3 z-10'>
        <IconSymbol
          name={card.rating === 2 ? 'battery.100' : card.rating === 1 ? 'battery.50' : 'battery.0'}
          color={card.rating === 2 ? '#22c55e' : card.rating === 1 ? '#f59e0b' : '#ef4444'}
          size={22}
        />
      </View>
      {(onEdit || onDelete) && (
        <View className='absolute top-3 right-3 z-10 flex-row gap-2'>
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
      <View className='flex flex-col justify-center items-center gap-6 mt-10 px-6'>
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
