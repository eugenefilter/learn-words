import React from 'react'
import { Pressable, Text, Platform } from 'react-native'
import clsx from 'clsx'

type ButtonProps = {
  title: string
  onPress: () => void
  variant?: 'primary' | 'secondary'
  className?: string
}

const Button = ({ title, onPress, variant = 'primary', className }: ButtonProps) => {
  const base = 'px-4 py-4 rounded-xl items-center justify-center'
  const styles = clsx(
    base,
    variant === 'primary' && 'bg-accent-600',
    variant === 'secondary' && 'bg-primary-300',
    className
  )

  const textStyles = clsx('text-white text-lg font-semibold')

  return (
    <Pressable
      className={styles}
      onPress={onPress}
      android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
      style={({ pressed }) => [
        pressed ? {
          opacity: Platform.OS === 'ios' ? 0.9 : 1,
          transform: [{ scale: 0.94 }],
          backgroundColor: variant === 'primary' ? '#0d9488' : '#1e4747', // accent-700 / primary-200
        } : undefined,
      ]}
    >
      <Text className={textStyles}>{title}</Text>
    </Pressable>
  )
}

export default Button
