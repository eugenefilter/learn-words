import React from 'react'
import { Pressable, Text } from 'react-native'
import clsx from 'clsx'

type ButtonProps = {
  title: string
  onPress: () => void
  variant?: 'primary' | 'secondary'
  className?: string
}

const Button = ({ title, onPress, variant = 'primary', className }: ButtonProps) => {
  const base = 'px-4 py-3 rounded-lg items-center justify-center my-2'
  const styles = clsx(
    base,
    variant === 'primary' && 'bg-accent-600',
    variant === 'secondary' && 'bg-primary-800 border border-primary-200',
    className
  )

  const textStyles = clsx('text-white text-lg font-semibold')

  return (
    <Pressable className={styles} onPress={onPress}>
      <Text className={textStyles}>{title}</Text>
    </Pressable>
  )
}

export default Button
