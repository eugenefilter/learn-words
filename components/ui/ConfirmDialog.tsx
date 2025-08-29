import React from 'react'
import { Modal, View, Text, Pressable } from 'react-native'
import Button from './Button'

type ConfirmDialogProps = {
  visible: boolean
  title?: string
  message?: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
}

const ConfirmDialog = ({
  visible,
  title = 'Подтвердите действие',
  message = 'Вы уверены, что хотите продолжить?',
  confirmText = 'Подтвердить',
  cancelText = 'Отмена',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) => {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View className='flex-1 items-center justify-center bg-black/50 px-5'>
        <Pressable className='absolute inset-0' onPress={onCancel} />
        <View className='w-full rounded-2xl bg-primary-800 border border-primary-200 p-5'>
          <Text className='text-primary-100 text-xl font-semibold mb-2'>{title}</Text>
          <Text className='text-primary-100 opacity-90'>{message}</Text>
          <View className='flex-row gap-3 mt-5'>
            <View className='flex-1'>
              <Button title={cancelText} variant='secondary' onPress={onCancel} className='w-full' />
            </View>
            <View className='flex-1'>
              <Button title={confirmText} onPress={onConfirm} className='w-full' />
            </View>
          </View>
        </View>
      </View>
    </Modal>
  )
}

export default ConfirmDialog

