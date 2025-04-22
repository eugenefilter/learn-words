import { View, Text } from 'react-native'
import clsx from 'clsx'
import React from 'react'

const Notification = () => {
  const isRead = true;

  const bg = clsx(
    'mt-2 p-4 rounded-lg',
    {
      'bg-gray-200 text-gray-500': isRead,
      'bg-blue-100 text-blue-900': !isRead,
    }
  );

  return (
    <View className="mt-6">
      <Text className="text-sm text-gray-500">12 Jun, 2025</Text>
      <View className={bg}>
        <Text className='font-bold'>Notification Title</Text>
        <Text className='mt-2'>
          We remind you to complete the tasks that have not been done, the spirit of good luck
        </Text>
      </View>
    </View>
  )
}

export default Notification