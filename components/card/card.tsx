import { View, Text, Pressable, ScrollView } from 'react-native'
import React, {FC} from 'react'
import { Pencil, Trash } from 'lucide-react-native'
import { TCard } from '@/types/TCard'

interface ICardProps {
  card: TCard,
  onEdit: (id: number) => void
  onDelete: (id: number) => void
}

const renderItems = (item: string, key: number) => {
  return <Text key={key} className='text-primary-900 text-xl font-bold border-b border-primary-300 py-3'>
    {item}
  </Text>
}

const Card: FC<ICardProps> = ({card, onEdit, onDelete}) => {
  return (
    <View className='w-[90%] mx-auto my-3 rounded-lg p-5 flex flex-col bg-primary-800'>
      <View className="flex flex-row justify-between items-start mb-4">
        <View className='flex-1'>
          <Text className="text-2xl font-bold mb-2 text-left text-primary-100 uppercase">
            {card.word}
            </Text>
          <Text className="text-xl text-primary-100">Some explain word</Text>
        </View>
        <View className="flex flex-row gap-1">
          {/* <Pressable onPress={() => onEdit(card.id)} className="w-10 h-10">
            <Pencil color="#252525" />
          </Pressable> */}
          
          {/* <Pressable onPress={() =>onDelete(card.id)} className="w-10 h-10">
          <Trash color="red" />
          </Pressable> */}
      
        </View>
      </View>
       
      {/* <View className='mt-5 border-t'>
        <Text className='text-primary-100'>List with example sentenses</Text>
        <ScrollView>
          {
            card.examples.map(item => renderItems(item.sentence, item.id))
          }
        </ScrollView>
      </View> */}
    </View>
  )
}
 

export default Card