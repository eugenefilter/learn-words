import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, Pressable, Modal, TextInput, ScrollView } from 'react-native';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { useAppContext } from '@/context/AppContext';
import { LanguageModel } from '@/models/LanguageModel';
import { DictionaryModel } from '@/models/DictionaryModel';
import { CardModel } from '@/models/CardModel';
import Button from '@/components/ui/Button';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Toast from '@/components/ui/Toast';
import DictionaryPicker from '@/components/library/DictionaryPicker';
import theme from '@/constants/theme';

type Lang = { id: number; name: string; code?: string | null };
type Dict = { id: number; name: string; cardsCount?: number };

const LibraryScreen = () => {
  const { currentLanguageId, setCurrentLanguageId, currentDictionaryId, setCurrentDictionaryId } = useAppContext();
  const router = useRouter();
  const [languages, setLanguages] = useState<Lang[]>([]);
  const [dicts, setDicts] = useState<Dict[]>([]);
  const [loading, setLoading] = useState(true);

  // UI state
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success'|'error'|'info'>('info');

  const [langModal, setLangModal] = useState<{ visible: boolean; mode: 'add'|'edit'; id?: number; name: string; code?: string }>(() => ({ visible: false, mode: 'add', name: '' }));
  const [dictModal, setDictModal] = useState<{ visible: boolean; mode: 'add'|'edit'; id?: number; name: string }>(() => ({ visible: false, mode: 'add', name: '' }));

  const [confirmDeleteLang, setConfirmDeleteLang] = useState<{ visible: boolean; id?: number }>({ visible: false });
  const [confirmDeleteDict, setConfirmDeleteDict] = useState<{ visible: boolean; id?: number }>({ visible: false });
  const [dictDeleteMode, setDictDeleteMode] = useState<'delete'|'move'>('delete');
  const [dictMovePickerVisible, setDictMovePickerVisible] = useState(false);
  const [dictMoveTargetId, setDictMoveTargetId] = useState<number | null>(null);

  const [exportModal, setExportModal] = useState<{ visible: boolean; csv: string }>(() => ({ visible: false, csv: '' }));
  const [importModal, setImportModal] = useState<{ visible: boolean; dictId?: number; text: string }>(() => ({ visible: false, text: '' }));

  const load = async () => {
    setLoading(true);
    const langs = await LanguageModel.all();
    setLanguages(langs);
    const lid = currentLanguageId ?? langs[0]?.id ?? null;
    if (lid) {
      if (!currentLanguageId) setCurrentLanguageId(lid);
      const list = await DictionaryModel.allByLanguage(lid);
      setDicts(list);
      if (!currentDictionaryId && list[0]?.id) setCurrentDictionaryId(list[0].id);
    } else {
      setDicts([]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { (async () => {
    if (currentLanguageId) {
      const list = await DictionaryModel.allByLanguage(currentLanguageId);
      setDicts(list);
    }
  })(); }, [currentLanguageId]);

  const openAddLanguage = () => setLangModal({ visible: true, mode: 'add', name: '', code: '' });
  const openEditLanguage = (l: Lang) => setLangModal({ visible: true, mode: 'edit', id: l.id, name: l.name, code: l.code ?? '' });
  const saveLanguage = async () => {
    try {
      if (langModal.mode === 'add') {
        await LanguageModel.create(langModal.name.trim(), langModal.code?.trim() || null, null);
      } else if (langModal.id) {
        await LanguageModel.update(langModal.id, langModal.name.trim(), langModal.code?.trim() || null, null);
      }
      setLangModal({ visible: false, mode: 'add', name: '' });
      await load();
      setToastType('success'); setToastMessage('Сохранено'); setToastVisible(true);
    } catch (e) {
      setToastType('error'); setToastMessage('Ошибка сохранения языка'); setToastVisible(true);
    }
  };

  const deleteLanguage = async () => {
    try {
      if (confirmDeleteLang.id) await LanguageModel.delete(confirmDeleteLang.id);
      setConfirmDeleteLang({ visible: false });
      await load();
      setToastType('success'); setToastMessage('Язык удалён'); setToastVisible(true);
    } catch (e) {
      setToastType('error'); setToastMessage('Не удалось удалить язык'); setToastVisible(true);
    }
  };

  const openAddDict = () => setDictModal({ visible: true, mode: 'add', name: '' });
  const openEditDict = (d: Dict) => setDictModal({ visible: true, mode: 'edit', id: d.id, name: d.name });
  const saveDict = async () => {
    try {
      if (!currentLanguageId) return;
      if (dictModal.mode === 'add') {
        await DictionaryModel.create(currentLanguageId, dictModal.name.trim());
      } else if (dictModal.id) {
        await DictionaryModel.update(dictModal.id, dictModal.name.trim());
      }
      setDictModal({ visible: false, mode: 'add', name: '' });
      const list = await DictionaryModel.allByLanguage(currentLanguageId);
      setDicts(list);
      setToastType('success'); setToastMessage('Сохранено'); setToastVisible(true);
    } catch (e) {
      setToastType('error'); setToastMessage('Ошибка сохранения словаря'); setToastVisible(true);
    }
  };

  const deleteDict = async () => {
    try {
      const id = confirmDeleteDict.id;
      if (!id) return;
      if (dictDeleteMode === 'delete') {
        await DictionaryModel.deleteWithCards(id);
      } else if (dictDeleteMode === 'move') {
        if (!dictMoveTargetId) return;
        await DictionaryModel.moveAllCards(id, dictMoveTargetId);
        await DictionaryModel.delete(id);
      }
      setConfirmDeleteDict({ visible: false });
      setDictMoveTargetId(null);
      if (currentLanguageId) {
        const list = await DictionaryModel.allByLanguage(currentLanguageId);
        setDicts(list);
      }
      setToastType('success'); setToastMessage('Словарь удалён'); setToastVisible(true);
    } catch (e) {
      setToastType('error'); setToastMessage('Не удалось удалить словарь'); setToastVisible(true);
    }
  };

  const exportCSV = async (dictId: number) => {
    const cards = await CardModel.allWithExamplesByDictionary(dictId);
    const header = 'word,translation,transcription,rating,examples';
    const rows = cards.map(c => {
      const ex = (c.examples || []).map(e => e.sentence.replace(/\n/g, ' ')).join('; ');
      const cells = [c.word, c.translation, c.transcription ?? '', String(c.rating ?? 0), ex];
      // simple escaping quotes
      return cells.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',');
    });
    const csv = [header, ...rows].join('\n');
    setExportModal({ visible: true, csv });
  };

  const importCSV = async () => {
    try {
      const dictId = importModal.dictId;
      if (!dictId) return;
      const text = importModal.text.trim();
      if (!text) return;
      const lines = text.split(/\r?\n/).filter(Boolean);
      if (lines.length <= 1) return;
      const [, ...data] = lines; // skip header
      for (const line of data) {
        const cells = parseCsvLine(line);
        const [word, translation, transcription, ratingStr, examplesStr] = cells;
        const examples = (examplesStr || '').split(/;\s*/).filter(Boolean);
        const rating = Number.parseInt(ratingStr || '0', 10) || 0;
        // дедупликация по слову в рамках словаря (без учёта регистра)
        const exists = await CardModel.existsInDictionary(word, dictId);
        if (!exists) {
          await CardModel.create(word, translation, transcription ? transcription : null, examples, rating, dictId);
        }
      }
      setImportModal({ visible: false, text: '' });
      setToastType('success'); setToastMessage('Импорт завершён'); setToastVisible(true);
    } catch (e) {
      setToastType('error'); setToastMessage('Ошибка импорта'); setToastVisible(true);
    }
  };

  const parseCsvLine = (line: string): string[] => {
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (line[i + 1] === '"') { cur += '"'; i++; } else { inQuotes = false; }
        } else { cur += ch; }
      } else {
        if (ch === ',') { result.push(cur); cur = ''; }
        else if (ch === '"') { inQuotes = true; }
        else { cur += ch; }
      }
    }
    result.push(cur);
    return result.map(s => s.trim());
  };

  return (
    <View className='flex-1 bg-primary-900 px-4 pt-6'>
      <View className='flex-row items-center justify-between mb-3'>
        <Text className='text-primary-100 text-2xl'>Библиотека</Text>
        <Pressable onPress={() => router.push('/csv')} className='px-3 py-2 rounded-xl border border-primary-300'>
          <Text className='text-primary-100 text-xs'>Импорт/Экспорт CSV</Text>
        </Pressable>
      </View>

      <View className='mb-4'>
        <View className='flex-row justify-between items-center mb-2'>
          <Text className='text-primary-100 text-lg'>Языки</Text>
          <Button title='Добавить' onPress={openAddLanguage} />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className='flex-row gap-2'>
            {languages.map(l => (
              <Pressable key={l.id} onPress={() => setCurrentLanguageId(l.id)} className={`px-3 py-2 rounded-xl border ${currentLanguageId===l.id ? 'bg-primary-700 border-accent-600' : 'border-primary-300'}`}>
                <Text className='text-primary-100'>{l.name}</Text>
                <View className='flex-row gap-2 mt-2'>
                  <Pressable onPress={() => openEditLanguage(l)} className='px-2 py-1 rounded border border-primary-300'>
                    <Text className='text-primary-100 text-xs'>Переимен.</Text>
                  </Pressable>
                  <Pressable onPress={() => setConfirmDeleteLang({ visible: true, id: l.id })} className='px-2 py-1 rounded border border-primary-300'>
                    <Text className='text-primary-100 text-xs'>Удалить</Text>
                  </Pressable>
                </View>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>

      <View className='flex-1'>
        <View className='flex-row justify-between items-center mb-2'>
          <Text className='text-primary-100 text-lg'>Словари</Text>
          <Button title='Добавить' onPress={openAddDict} />
        </View>
        <FlatList
          data={dicts}
          keyExtractor={(d) => d.id.toString()}
          renderItem={({ item }) => (
            <View className='mb-2 p-3 rounded-xl border border-primary-300 bg-primary-800'>
              <View className='flex-row justify-between items-center'>
                <Pressable onPress={() => setCurrentDictionaryId(item.id)} className='flex-1'>
                  <Text className='text-primary-100 text-base'>
                    {item.name} {item.cardsCount !== undefined ? `(${item.cardsCount})` : ''} {currentDictionaryId===item.id ? '• текущий' : ''}
                  </Text>
                </Pressable>
                <View className='flex-row gap-2'>
                  <Pressable onPress={() => exportCSV(item.id)} className='px-2 py-1 rounded border border-primary-300'>
                    <Text className='text-primary-100 text-xs'>Экспорт</Text>
                  </Pressable>
                  <Pressable onPress={() => setImportModal({ visible: true, dictId: item.id, text: '' })} className='px-2 py-1 rounded border border-primary-300'>
                    <Text className='text-primary-100 text-xs'>Импорт</Text>
                  </Pressable>
                  <Pressable onPress={() => openEditDict(item)} className='px-2 py-1 rounded border border-primary-300'>
                    <Text className='text-primary-100 text-xs'>Переимен.</Text>
                  </Pressable>
                  <Pressable onPress={() => { setConfirmDeleteDict({ visible: true, id: item.id }); setDictDeleteMode('delete'); }} className='px-2 py-1 rounded border border-primary-300'>
                    <Text className='text-primary-100 text-xs'>Удалить</Text>
                  </Pressable>
                </View>
              </View>
              <View className='flex-row gap-2 mt-2'>
                <Pressable onPress={() => { setDictDeleteMode('delete'); setConfirmDeleteDict({ visible: true, id: item.id }); }} className='px-3 py-2 rounded-xl border border-primary-300'>
                  <Text className='text-primary-100 text-xs'>Удалить с карточками</Text>
                </Pressable>
                <Pressable onPress={() => { setDictMovePickerVisible(true); setConfirmDeleteDict({ visible: true, id: item.id }); setDictDeleteMode('move'); }} className='px-3 py-2 rounded-xl border border-primary-300'>
                  <Text className='text-primary-100 text-xs'>Перенести карточки и удалить</Text>
                </Pressable>
              </View>
            </View>
          )}
        />
      </View>

      {/* Language modal */}
      <Modal visible={langModal.visible} transparent animationType='fade' onRequestClose={() => setLangModal({ visible: false, mode: 'add', name: '' })}>
        <View className='flex-1 items-center justify-center px-5'>
          <BlurView intensity={35} tint='dark' className='absolute inset-0' />
          <View className='absolute inset-0 bg-black/35' />
          <Pressable className='absolute inset-0' onPress={() => setLangModal({ visible: false, mode: 'add', name: '' })} />
          <View className='w-full rounded-2xl bg-primary-800 border border-primary-200 p-5'>
            <Text className='text-primary-100 text-xl font-semibold mb-3'>{langModal.mode==='add'?'Новый язык':'Переименовать язык'}</Text>
            <TextInput className='w-full p-3 text-white rounded-xl bg-primary-300 border border-primary-200 mb-2' value={langModal.name} onChangeText={(t) => setLangModal(prev => ({ ...prev, name: t }))} placeholder='Например: English' placeholderTextColor={theme.colors.textMuted} />
            <TextInput className='w-full p-3 text-white rounded-xl bg-primary-300 border border-primary-200 mb-2' value={langModal.code} onChangeText={(t) => setLangModal(prev => ({ ...prev, code: t }))} placeholder='Код (en, de, es...)' placeholderTextColor={theme.colors.textMuted} />
            <View className='flex-row gap-3 mt-3'>
              <View className='flex-1'><Button title='Отмена' variant='secondary' onPress={() => setLangModal({ visible: false, mode: 'add', name: '' })} /></View>
              <View className='flex-1'><Button title='Сохранить' onPress={saveLanguage} /></View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Dict modal */}
      <Modal visible={dictModal.visible} transparent animationType='fade' onRequestClose={() => setDictModal({ visible: false, mode: 'add', name: '' })}>
        <View className='flex-1 items-center justify-center px-5'>
          <BlurView intensity={35} tint='dark' className='absolute inset-0' />
          <View className='absolute inset-0 bg-black/35' />
          <Pressable className='absolute inset-0' onPress={() => setDictModal({ visible: false, mode: 'add', name: '' })} />
          <View className='w-full rounded-2xl bg-primary-800 border border-primary-200 p-5'>
            <Text className='text-primary-100 text-xl font-semibold mb-3'>{dictModal.mode==='add'?'Новый словарь':'Переименовать словарь'}</Text>
            <TextInput className='w-full p-3 text-white rounded-xl bg-primary-300 border border-primary-200 mb-2' value={dictModal.name} onChangeText={(t) => setDictModal(prev => ({ ...prev, name: t }))} placeholder='Например: Мой словарь' placeholderTextColor={theme.colors.textMuted} />
            <View className='flex-row gap-3 mt-3'>
              <View className='flex-1'><Button title='Отмена' variant='secondary' onPress={() => setDictModal({ visible: false, mode: 'add', name: '' })} /></View>
              <View className='flex-1'><Button title='Сохранить' onPress={saveDict} /></View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete language confirm */}
      <ConfirmDialog
        visible={confirmDeleteLang.visible}
        title='Удалить язык?'
        message='Будут удалены все словари и карточки этого языка.'
        confirmText='Удалить'
        cancelText='Отмена'
        onCancel={() => setConfirmDeleteLang({ visible: false })}
        onConfirm={deleteLanguage}
      />

      {/* Delete dictionary confirm */}
      <ConfirmDialog
        visible={confirmDeleteDict.visible}
        title={dictDeleteMode==='delete' ? 'Удалить словарь?' : 'Перенести карточки и удалить?'}
        message={dictDeleteMode==='delete' ? 'Будут удалены все карточки словаря.' : (dictMoveTargetId ? 'Карточки будут перенесены. Подтвердите удаление словаря.' : 'Выберите словарь для переноса карточек.')} 
        confirmText='Продолжить'
        cancelText='Отмена'
        onCancel={() => { setConfirmDeleteDict({ visible: false }); setDictMoveTargetId(null); }}
        onConfirm={deleteDict}
      />

      {/* Pick target dictionary for move */}
      <DictionaryPicker
        visible={dictMovePickerVisible}
        onClose={() => setDictMovePickerVisible(false)}
        onSelect={(id) => setDictMoveTargetId(id)}
      />

      {/* Export modal */}
      <Modal visible={exportModal.visible} transparent animationType='fade' onRequestClose={() => setExportModal({ visible: false, csv: '' })}>
        <View className='flex-1 items-center justify-center px-5'>
          <BlurView intensity={35} tint='dark' className='absolute inset-0' />
          <View className='absolute inset-0 bg-black/35' />
          <Pressable className='absolute inset-0' onPress={() => setExportModal({ visible: false, csv: '' })} />
          <View className='w-full rounded-2xl bg-primary-800 border border-primary-200 p-5 max-h-[80%]'>
            <Text className='text-primary-100 text-xl font-semibold mb-3'>Экспорт CSV</Text>
            <ScrollView style={{ maxHeight: 360 }}>
              <Text className='text-primary-100 text-xs'>{exportModal.csv}</Text>
            </ScrollView>
            <View className='mt-3'>
              <Button title='Закрыть' onPress={() => setExportModal({ visible: false, csv: '' })} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Import modal */}
      <Modal visible={importModal.visible} transparent animationType='fade' onRequestClose={() => setImportModal({ visible: false, text: '' })}>
        <View className='flex-1 items-center justify-center px-5'>
          <BlurView intensity={35} tint='dark' className='absolute inset-0' />
          <View className='absolute inset-0 bg-black/35' />
          <Pressable className='absolute inset-0' onPress={() => setImportModal({ visible: false, text: '' })} />
          <View className='w-full rounded-2xl bg-primary-800 border border-primary-200 p-5 max-h-[80%]'>
            <Text className='text-primary-100 text-xl font-semibold mb-3'>Импорт CSV</Text>
            <Text className='text-primary-100 opacity-80 mb-2'>Формат: word,translation,transcription,rating,examples (разделитель примеров — ;)</Text>
            <TextInput
              className='w-full p-3 text-white rounded-xl bg-primary-300 border border-primary-200'
              style={{ minHeight: 160, textAlignVertical: 'top' }}
              multiline
              value={importModal.text}
              onChangeText={(t) => setImportModal(prev => ({ ...prev, text: t }))}
              placeholder='Вставьте CSV...'
              placeholderTextColor={theme.colors.textMuted}
            />
            <View className='flex-row gap-3 mt-3'>
              <View className='flex-1'><Button title='Отмена' variant='secondary' onPress={() => setImportModal({ visible: false, text: '' })} /></View>
              <View className='flex-1'><Button title='Импортировать' onPress={importCSV} /></View>
            </View>
          </View>
        </View>
      </Modal>

      <Toast visible={toastVisible} message={toastMessage} type={toastType} position='top' onHide={() => setToastVisible(false)} />
    </View>
  );
};

export default LibraryScreen;
