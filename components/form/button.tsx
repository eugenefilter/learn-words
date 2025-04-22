import { Text, View, Pressable, PressableProps } from 'react-native'
import React, { FC } from 'react'
import clsx from 'clsx'

interface ButtonProps extends PressableProps {
  title: string,
  className?: string
}

const Button: FC<ButtonProps> = ({
  className,
  title,
  onPress,
  ...rest
}) => {
  const contein = clsx(
    'w-full h-[50px] bg-purple-600 bg-indigo-700 hover:bg-indigo-900 rounded-lg py-2 px-6',
    className
  )

  return (  
    <Pressable className={contein} onPress={onPress} {...rest}>
        <Text className="text-center text-white text-2xl font-bold ">
          { title }
        </Text>
    </Pressable>
  )
}

export default Button