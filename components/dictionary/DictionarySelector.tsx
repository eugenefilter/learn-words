import React, { useCallback, useEffect, useState } from 'react';
import { Modal, View, Text, FlatList, Pressable, TextInput } from 'react-native';
import { BlurView } from 'expo-blur';
import { useAppContext } from '@/context/AppContext';
import { DictionaryModel } from '@/models/DictionaryModel';
import Button from '@/components/ui/Button';
import theme from '@/constants/theme';
import { TDictionary } from '@/types/TDictionary';

type DictionarySelectorProps = {
  buttonClassName?: string;
  textClassName?: string;
  hintText?: string;
  modalTitle?: string;
  placeholder?: string;
};

const DictionarySelector: React.FC<DictionarySelectorProps> = ({
  buttonClassName = '',
  textClassName = 'text-primary-100 text-sm',
  hintText,
  modalTitle = 'Выберите словарь',
  placeholder = 'Словарь',
}) => {
  const { currentLanguageId, currentDictionaryId, setCurrentDictionaryId } = useAppContext();

  const [visible, setVisible] = useState(false);
  const [items, setItems] = useState<TDictionary[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [currentName, setCurrentName] = useState('');

  const closeModal = useCallback(() => {
    setVisible(false);
    setCreating(false);
    setNewName('');
  }, []);

  const loadItems = useCallback(async () => {
    if (!currentLanguageId) {
      setItems([]);
      return;
    }

    setLoading(true);
    try {
      const list = await DictionaryModel.allByLanguage(currentLanguageId);
      setItems(list);
    } finally {
      setLoading(false);
    }
  }, [currentLanguageId]);

  useEffect(() => {
    let cancelled = false;

    const loadCurrentName = async () => {
      if (!currentDictionaryId) {
        if (!cancelled) setCurrentName('');
        return;
      }

      const dict = await DictionaryModel.findById(currentDictionaryId);
      if (!cancelled) {
        setCurrentName((dict?.name || '').trim());
      }
    };

    loadCurrentName();
    return () => {
      cancelled = true;
    };
  }, [currentDictionaryId]);

  useEffect(() => {
    if (!visible) return;
    loadItems();
  }, [visible, loadItems]);

  const selectDictionary = useCallback((id: number) => {
    setCurrentDictionaryId(id);
    closeModal();
  }, [setCurrentDictionaryId, closeModal]);

  const createDictionary = useCallback(async () => {
    const name = newName.trim();
    if (!currentLanguageId || !name) return;

    const id = await DictionaryModel.create(currentLanguageId, name);
    setCurrentDictionaryId(id);
    closeModal();
  }, [currentLanguageId, newName, setCurrentDictionaryId, closeModal]);

  return (
    <>
      <Pressable
        onPress={() => setVisible(true)}
        className={`self-start rounded-2xl border border-primary-300 bg-primary-800 px-6 py-3 ${buttonClassName}`.trim()}
      >
        <Text className={textClassName} numberOfLines={1}>
          {currentName || placeholder}
        </Text>
        {hintText ? (
          <Text className='text-primary-100 opacity-80 text-xs mt-1'>{hintText}</Text>
        ) : null}
      </Pressable>

      <Modal visible={visible} transparent animationType='fade' onRequestClose={closeModal}>
        <View className='flex-1 items-center justify-center px-5'>
          <BlurView intensity={35} tint='dark' className='absolute inset-0' />
          <View className='absolute inset-0 bg-black/35' />
          <Pressable className='absolute inset-0' onPress={closeModal} />

          <View className='w-full rounded-3xl bg-primary-800 border border-primary-200 p-5 max-h-[75%]'>
            <Text className='text-primary-100 text-2xl font-semibold mb-4'>{modalTitle}</Text>

            {loading ? (
              <Text className='text-primary-100 opacity-70 mb-3'>Загрузка словарей...</Text>
            ) : (
              <FlatList
                style={{ maxHeight: 280 }}
                data={items}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => {
                  const isCurrent = currentDictionaryId === item.id;
                  return (
                    <Pressable
                      onPress={() => selectDictionary(item.id)}
                      className={`px-4 py-4 rounded-2xl border mb-3 ${isCurrent ? 'bg-primary-700 border-accent-600' : 'border-primary-300 bg-primary-800'}`}
                    >
                      <Text className='text-primary-100 text-2xl'>
                        {item.name} ({item.cardsCount ?? 0})
                      </Text>
                    </Pressable>
                  );
                }}
                ListEmptyComponent={<Text className='text-primary-100 opacity-70'>Словари не найдены</Text>}
              />
            )}

            {creating ? (
              <View className='mt-2'>
                <TextInput
                  className='w-full p-3 text-white rounded-xl bg-primary-300 border border-primary-200'
                  value={newName}
                  onChangeText={setNewName}
                  placeholder='Название нового словаря'
                  placeholderTextColor={theme.colors.textMuted}
                />
                <View className='flex-row gap-3 mt-3'>
                  <View className='flex-1'>
                    <Button title='Отмена' variant='secondary' onPress={() => { setCreating(false); setNewName(''); }} />
                  </View>
                  <View className='flex-1'>
                    <Button title='Создать' onPress={createDictionary} />
                  </View>
                </View>
              </View>
            ) : (
              <View className='mt-2'>
                <Button title='Создать новый словарь' onPress={() => setCreating(true)} />
              </View>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
};

export default DictionarySelector;
