import { StyleSheet, Text, View, Pressable } from 'react-native'
import React, { FC } from 'react'
import { TCard } from '@/types/TCard'
import { Pencil, Trash } from 'lucide-react-native'

interface ICardProps {
  card: TCard,
  onEdit?: () => void,
  onDelete?: () => void,
}

const BackCard: FC<ICardProps> = ({card, onEdit, onDelete}) => {
  return (
    <View className='bg-primary-800 h-[64%] border border-primary-200 mt-3 mx-5 rounded-xl flex items-center justify-center px-6 relative'>
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
      <Text className='text-primary-100 text-4xl text-center'>
        {card.translation}
      </Text>
    </View>
  )
}

export default BackCard;
