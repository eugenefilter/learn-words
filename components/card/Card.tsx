import { View, Text, Pressable } from 'react-native'
import React, { FC, memo } from 'react'
import { Pencil, Trash } from 'lucide-react-native'
import { Swipeable } from 'react-native-gesture-handler'
import { TCard } from '@/types/TCard'
import RatingProgress from '@/components/ui/RatingProgress'

interface ICardProps {
  card: TCard,
  onEdit: (id: number) => void
  onDelete: (id: number) => void
  onPress?: () => void
}

const Card: FC<ICardProps> = ({ card, onEdit, onDelete, onPress }) => {
  const rating = card.rating ?? 0

  const handleEdit = () => {
    onEdit(card.id)
  }

  const handleDelete = () => {
    onDelete(card.id)
  }

  const renderLeftActions = () => (
    <View style={{ width: '25%' }}>
      <Pressable
        onPress={handleEdit}
        className='h-full items-center justify-center bg-primary-300'
        style={{ width: '100%' }}
      >
        <Pencil color='#d9ebeb' size={24} />
      </Pressable>
    </View>
  )

  const renderRightActions = () => (
    <View style={{ width: '25%' }}>
      <Pressable
        onPress={handleDelete}
        className='h-full items-center justify-center bg-red-500'
        style={{ width: '100%' }}
      >
        <Trash color='#ffffff' size={24} />
      </Pressable>
    </View>
  )

  return (
    <View className='w-[92%] mx-auto my-2 rounded-xl overflow-hidden border border-primary-200 bg-primary-800'>
      <Swipeable
        renderLeftActions={renderLeftActions}
        renderRightActions={renderRightActions}
        leftThreshold={24}
        rightThreshold={24}
        overshootLeft={false}
        overshootRight={false}
      >
        <Pressable
          onPress={onPress}
          className='w-full px-5 py-2.5 flex flex-col bg-primary-800'
        >
          <View className='flex-row items-start justify-between'>
            <View className='flex-1 pr-3'>
              <Text className="text-left text-primary-100 uppercase" style={{ fontSize: 14, lineHeight: 18 }}>
                {card.word}
              </Text>
              <Text className="text-primary-100 opacity-90 mt-1" style={{ fontSize: 14, lineHeight: 18 }}>
                {[card.translation, card.transcription].filter(Boolean).join(' / ')}
              </Text>
            </View>

            <View className='ml-2 mt-0.5'>
              <RatingProgress rating={rating} />
            </View>
          </View>
        </Pressable>
      </Swipeable>
    </View>
  )
}

export default memo(Card)
