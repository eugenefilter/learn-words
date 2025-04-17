import { View, Text, Pressable } from 'react-native'
import React, {FC} from 'react'
import { Pencil, Trash } from 'lucide-react-native'
import { TCard } from '@/types/TCard'

interface ICardProps {
  card: TCard,
  onEdit: (id: number) => void
  onDelete: (id: number) => void
}

const Card: FC<ICardProps> = ({card, onEdit, onDelete}) => {
  return (
    <View className='bg-purple-100 rounded-2xl p-6 w-full flex flex-col'>
      <View className="flex flex-row justify-between items-start mb-4">
        <View className='flex-1'>
          <Text className="text-4xl font-bold mb-2 text-center">{card.word}</Text>
          <Text className="text-2xl text-gray-600">Some explain word</Text>
        </View>
        <View className="flex flex-row gap-1">
          <Pressable onPress={() => onEdit(card.id)} className="w-10 h-10">
            <Pencil color="black" />
          </Pressable>
          
          <Pressable onPress={() =>onDelete(card.id)} className="w-10 h-10">
          <Trash color="red" />
          </Pressable>
      
        </View>
      </View>
      
      <View>
        <Text>List with example sentenses</Text>
      </View>
    </View>
  )
}
 

export default Card