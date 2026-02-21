import React, { useEffect, useState } from 'react';
import { Modal, View, Text, FlatList, Pressable, TextInput } from 'react-native';
import { BlurView } from 'expo-blur';
import { useAppContext } from '@/context/AppContext';
import { DictionaryModel } from '@/models/DictionaryModel';
import Button from '@/components/ui/Button';

type DictionaryPickerProps = {
  visible: boolean;
  onClose: () => void;
  onSelect: (dictionaryId: number) => void;
};

const DictionaryPicker: React.FC<DictionaryPickerProps> = ({ visible, onClose, onSelect }) => {
  const { currentLanguageId } = useAppContext();
  const [items, setItems] = useState<{ id: number; name: string; cardsCount?: number }[]>([]);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!currentLanguageId) return;
      const list = await DictionaryModel.allByLanguage(currentLanguageId);
      setItems(list);
    };
    if (visible) load();
  }, [visible, currentLanguageId]);

  const create = async () => {
    if (!currentLanguageId || !newName.trim()) return;
    const id = await DictionaryModel.create(currentLanguageId, newName.trim());
    setNewName('');
    setCreating(false);
    onSelect(id);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className='flex-1 items-center justify-center px-5'>
        <BlurView intensity={35} tint='dark' className='absolute inset-0' />
        <View className='absolute inset-0 bg-black/35' />
        <Pressable className='absolute inset-0' onPress={onClose} />
        <View className='w-full rounded-2xl bg-primary-800 border border-primary-200 p-5 max-h-[70%]'>
          <Text className='text-primary-100 text-xl font-semibold mb-3'>Выберите словарь</Text>
          <FlatList
            style={{ maxHeight: 260 }}
            data={items}
            keyExtractor={(i) => i.id.toString()}
            renderItem={({ item }) => (
              <Pressable onPress={() => { onSelect(item.id); onClose(); }} className='px-3 py-3 rounded-xl border border-primary-300 mb-2'>
                <Text className='text-primary-100'>{item.name} {typeof item.cardsCount === 'number' ? `(${item.cardsCount})` : ''}</Text>
              </Pressable>
            )}
          />

          {creating ? (
            <View className='mt-3'>
              <Text className='text-primary-100 mb-2'>Название нового словаря</Text>
              <TextInput
                className='w-full p-3 text-white rounded-xl bg-primary-300 border border-primary-200'
                value={newName}
                onChangeText={setNewName}
                placeholder='Например: Фразовые глаголы'
                placeholderTextColor={'#9fbfbf'}
              />
              <View className='flex-row gap-3 mt-3'>
                <View className='flex-1'>
                  <Button title='Отмена' variant='secondary' onPress={() => { setCreating(false); setNewName(''); }} />
                </View>
                <View className='flex-1'>
                  <Button title='Создать' onPress={create} />
                </View>
              </View>
            </View>
          ) : (
            <View className='mt-3'>
              <Button title='Создать новый словарь' onPress={() => setCreating(true)} />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

export default DictionaryPicker;
