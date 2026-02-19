import React from 'react'
import { Pressable, Text, Platform } from 'react-native'
import clsx from 'clsx'

type ButtonProps = {
  title: string
  onPress: () => void
  variant?: 'primary' | 'secondary' | 'danger' | 'success'
  className?: string
  disabled?: boolean
}

const Button = ({ title, onPress, variant = 'primary', className, disabled = false }: ButtonProps) => {
  const base = 'px-4 py-4 rounded-xl items-center justify-center'
  const styles = clsx(
    base,
    variant === 'primary' && 'bg-accent-600',
    variant === 'secondary' && 'bg-primary-300',
    variant === 'danger' && 'border border-red-500 bg-red-950',
    variant === 'success' && 'border border-green-500 bg-green-950',
    disabled && 'opacity-50',
    className,
  )

  const textStyles = clsx(
    'text-lg font-semibold',
    variant === 'danger' ? 'text-red-400' : variant === 'success' ? 'text-green-400' : 'text-white',
  )

  return (
    <Pressable
      className={styles}
      onPress={onPress}
      disabled={disabled}
      android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
      style={({ pressed }) => [
        pressed && !disabled ? {
          opacity: Platform.OS === 'ios' ? 0.9 : 1,
          transform: [{ scale: 0.94 }],
        } : undefined,
      ]}
    >
      <Text className={textStyles}>{title}</Text>
    </Pressable>
  )
}

export default Button
