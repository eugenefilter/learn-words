import { View, Text, Pressable } from 'react-native'
import React, { FC, memo } from 'react'
import { Pencil, Trash } from 'lucide-react-native'
import { IconSymbol } from '@/components/ui/IconSymbol'
import { TCard } from '@/types/TCard'
import { RATING_ICON, RATING_COLOR } from '@/constants/rating'

interface ICardProps {
  card: TCard,
  onEdit: (id: number) => void
  onDelete: (id: number) => void
  onPress?: () => void
}

const Card: FC<ICardProps> = ({ card, onEdit, onDelete, onPress }) => {
  const rating = card.rating ?? 0
  return (
    <Pressable onPress={onPress} className='w-[92%] mx-auto my-4 rounded-xl p-6 flex flex-col bg-primary-800 border border-primary-200'>
      <View className="flex flex-row justify-between items-start mb-4">
        <View className='flex-1'>
          <View className='flex-row items-center gap-2'>
            <Text className="text-2xl font-bold mb-2 text-left text-primary-100 uppercase">
              {card.word}
            </Text>
            <IconSymbol
              name={RATING_ICON[rating] as any}
              color={RATING_COLOR[rating]}
              size={20}
            />
          </View>
          {card.explanation ? (
            <Text className="text-base text-primary-100 opacity-80">{card.explanation}</Text>
          ) : null}
        </View>
        <View className="flex flex-row gap-1">
          <Pressable onPress={() => onEdit(card.id)} className="w-10 h-10 items-center justify-center">
            <Pencil color="#d9ebeb" />
          </Pressable>
          <Pressable onPress={() => onDelete(card.id)} className="w-10 h-10 items-center justify-center">
            <Trash color="#ef4444" />
          </Pressable>
        </View>
      </View>
    </Pressable>
  )
}

export default memo(Card)
