import React, { FC } from 'react'
import { TextInput, TextInputProps, TouchableOpacity, View } from 'react-native'
import clsx from 'clsx'
// import { Ionicons } from '@expo/vector-icons'

interface InputProps extends TextInputProps {
  rightElement?: React.ReactNode
  leftElement?: React.ReactNode
}

const Input: FC<InputProps> = ({
  placeholder,
  className,
  value,
  onChangeText,
  rightElement,
  leftElement,
  ...rest
}) => {
  const containerClass = clsx(
    'flex-row items-center bg-white border border-gray-200 rounded-2xl px-3 py-2',
    className
  )

  return (
    <View className={containerClass}>
      {leftElement && <View className="mr-2">{leftElement}</View>}
      
      <TextInput
        className="flex-1 outline-none text-2xl text-gray-800 h-[45px]"
        placeholder={placeholder}
        placeholderTextColor="#C4C4C4"
        value={value}
        onChangeText={onChangeText}
        {...rest}
      />

      {rightElement && <View className="ml-2">{rightElement}</View>}  
      {/* <TouchableOpacity
        onPress={onIconPress}
        className="bg-indigo-500 p-2 rounded-xl ml-2 w-10"
      >
        <Ionicons name="search" size={20} color="white" />
      </TouchableOpacity> */}
    </View>
  )
}

export default Input
