import { View, Text, Pressable } from 'react-native'
import React, { FC, memo, useRef } from 'react'
import { Pencil, Trash } from 'lucide-react-native'
import { Swipeable } from 'react-native-gesture-handler'
import { TCard } from '@/types/TCard'

interface ICardProps {
  card: TCard,
  onEdit: (id: number) => void
  onDelete: (id: number) => void
  onPress?: () => void
}

const Card: FC<ICardProps> = ({ card, onEdit, onDelete, onPress }) => {
  const rating = card.rating ?? 0
  const swipeableRef = useRef<Swipeable | null>(null)

  const statusColor = rating === 2 ? '#22c55e' : rating === 1 ? '#facc15' : '#ef4444'
  const progress = rating === 2 ? 100 : rating === 1 ? 60 : 25

  const handleEdit = () => {
    swipeableRef.current?.close()
    onEdit(card.id)
  }

  const handleDelete = () => {
    swipeableRef.current?.close()
    onDelete(card.id)
  }

  const renderLeftActions = () => (
    <View className='flex-1 my-2 px-[4%]'>
      <Pressable
        onPress={handleEdit}
        className='h-full rounded-xl bg-primary-300 items-start justify-center pl-6'
      >
        <View className='flex-row items-center gap-2'>
          <Pencil color='#d9ebeb' size={22} />
          <Text className='text-primary-100 text-lg font-semibold'>Редактировать</Text>
        </View>
      </Pressable>
    </View>
  )

  const renderRightActions = () => (
    <View className='flex-1 my-2 px-[4%]'>
      <Pressable
        onPress={handleDelete}
        className='h-full rounded-xl bg-red-500 items-end justify-center pr-6'
      >
        <View className='flex-row items-center gap-2'>
          <Text className='text-white text-lg font-semibold'>Удалить</Text>
          <Trash color='#ffffff' size={22} />
        </View>
      </Pressable>
    </View>
  )

  return (
    <Swipeable
      ref={swipeableRef}
      renderLeftActions={renderLeftActions}
      renderRightActions={renderRightActions}
      leftThreshold={48}
      rightThreshold={48}
      overshootLeft={false}
      overshootRight={false}
    >
      <Pressable onPress={onPress} className='w-[92%] mx-auto my-2 rounded-xl px-5 py-2.5 flex flex-col bg-primary-800 border border-primary-200'>
        <View className='flex-row items-start justify-between'>
          <View className='flex-1 pr-3'>
            <Text className="text-left text-primary-100 uppercase" style={{ fontSize: 14, lineHeight: 18 }}>
              {card.word}
            </Text>
            <Text className="text-primary-100 opacity-90 mt-1" style={{ fontSize: 14, lineHeight: 18 }}>
              {[card.translation, card.transcription].filter(Boolean).join(' / ')}
            </Text>
          </View>

          <View className='ml-2 mt-0.5 flex-row items-center'>
            <Text style={{ color: statusColor, fontSize: 11, lineHeight: 11 }} className='mr-1'>[</Text>
            <View className='w-14 h-1.5 rounded-sm overflow-hidden bg-primary-300/30 border border-primary-300/40'>
              <View
                className='h-full'
                style={{ width: `${progress}%`, backgroundColor: statusColor }}
              />
            </View>
            <Text style={{ color: statusColor, fontSize: 11, lineHeight: 11 }} className='ml-1'>]</Text>
          </View>
        </View>
      </Pressable>
    </Swipeable>
  )
}

export default memo(Card)
