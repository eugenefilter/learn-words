import React, { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useAppContext } from '@/context/AppContext';
import DictionaryPicker from '@/components/library/DictionaryPicker';
import Button from '@/components/ui/Button';
import Toast from '@/components/ui/Toast';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { CardModel } from '@/models/CardModel';

type DedupeMode = 'word' | 'word+translation';

const CsvScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { currentDictionaryId } = useAppContext();

  // Picker state
  const [pickerVisible, setPickerVisible] = useState(false);

  // Export state
  const [exportCsv, setExportCsv] = useState('');
  const [exporting, setExporting] = useState(false);

  // Import state
  const [importText, setImportText] = useState('');
  const [dedupeMode, setDedupeMode] = useState<DedupeMode>('word');
  const [importStats, setImportStats] = useState<{ total: number; toAdd: number; duplicates: number } | null>(null);
  const [importing, setImporting] = useState(false);

  // UI feedback
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success'|'error'|'info'>('info');
  const [confirmVisible, setConfirmVisible] = useState(false);

  const bottomInset = (tabBarHeight || 0) + insets.bottom + 12;

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

  const buildCsv = async () => {
    if (!currentDictionaryId) {
      setToastType('error'); setToastMessage('Выберите словарь для экспорта'); setToastVisible(true);
      return;
    }
    try {
      setExporting(true);
      const cards = await CardModel.allWithExamplesByDictionary(currentDictionaryId);
      const header = 'word,translation,transcription,rating,examples';
      const rows = cards.map(c => {
        const ex = (c.examples || []).map(e => e.sentence.replace(/\n/g, ' ')).join('; ');
        const cells = [c.word, c.translation, c.transcription ?? '', String(c.rating ?? 0), ex];
        return cells.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',');
      });
      setExportCsv([header, ...rows].join('\n'));
      setToastType('success'); setToastMessage('CSV сформирован'); setToastVisible(true);
    } catch (e) {
      setToastType('error'); setToastMessage('Ошибка экспорта'); setToastVisible(true);
    } finally {
      setExporting(false);
    }
  };

  const analyzeImport = async () => {
    if (!currentDictionaryId) { setToastType('error'); setToastMessage('Выберите словарь для импорта'); setToastVisible(true); return; }
    const text = importText.trim();
    if (!text) { setImportStats(null); return; }
    const lines = text.split(/\r?\n/).filter(Boolean);
    if (lines.length <= 1) { setImportStats({ total: 0, toAdd: 0, duplicates: 0 }); return; }
    const [, ...data] = lines; // skip header
    let total = 0, toAdd = 0, duplicates = 0;
    for (const line of data) {
      const [word, translation] = parseCsvLine(line);
      if (!word || !translation) continue;
      total++;
      const exists = dedupeMode === 'word'
        ? await CardModel.existsInDictionary(word, currentDictionaryId)
        : await CardModel.existsByWordAndTranslation(word, translation, currentDictionaryId);
      if (exists) duplicates++; else toAdd++;
    }
    setImportStats({ total, toAdd, duplicates });
  };

  const performImport = async () => {
    if (!currentDictionaryId) { setToastType('error'); setToastMessage('Выберите словарь для импорта'); setToastVisible(true); return; }
    const text = importText.trim();
    if (!text) return;
    try {
      setImporting(true);
      const lines = text.split(/\r?\n/).filter(Boolean);
      if (lines.length <= 1) return;
      const [, ...data] = lines;
      let added = 0, skipped = 0;
      for (const line of data) {
        const cells = parseCsvLine(line);
        const [word, translation, transcription, ratingStr, examplesStr] = cells;
        if (!word || !translation) { continue; }
        const exists = dedupeMode === 'word'
          ? await CardModel.existsInDictionary(word, currentDictionaryId)
          : await CardModel.existsByWordAndTranslation(word, translation, currentDictionaryId);
        if (exists) { skipped++; continue; }
        const examples = (examplesStr || '').split(/;\s*/).filter(Boolean);
        const rating = Number.parseInt(ratingStr || '0', 10) || 0;
        await CardModel.create(word, translation, transcription ? transcription : null, examples, rating, currentDictionaryId);
        added++;
      }
      setToastType('success'); setToastMessage(`Импорт: добавлено ${added}, пропущено ${skipped}`); setToastVisible(true);
      setConfirmVisible(false);
    } catch (e) {
      setToastType('error'); setToastMessage('Ошибка импорта'); setToastVisible(true);
    } finally {
      setImporting(false);
    }
  };

  return (
    <KeyboardAvoidingView className='flex-1 bg-primary-900' behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ paddingBottom: bottomInset + 84 }} className='flex-1 px-5 pt-6'>
        <Pressable onPress={() => setPickerVisible(true)} className='mb-4 px-3 py-3 rounded-xl border border-primary-200 bg-primary-300'>
          <Text className='text-primary-100'>Выбрать словарь</Text>
          <Text className='text-primary-100 opacity-80 text-xs mt-1'>Текущий используется для экспорта/импорта</Text>
        </Pressable>

        <View className='rounded-2xl border border-primary-200 bg-primary-800 p-4 mb-5'>
          <Text className='text-primary-100 text-lg mb-2'>Экспорт CSV</Text>
          <Button title={exporting ? 'Формирование…' : 'Сформировать CSV'} disabled={exporting} onPress={buildCsv} />
          <Text className='text-primary-100 opacity-80 mt-3 mb-1 text-xs'>Формат: word, translation, transcription, rating, examples(; разделитель)</Text>
          <TextInput
            className='w-full p-3 text-white rounded-xl bg-primary-300 border border-primary-200'
            style={{ minHeight: 120, textAlignVertical: 'top' }}
            multiline
            value={exportCsv}
            onChangeText={setExportCsv}
            placeholder='Здесь появится CSV'
            placeholderTextColor={'#9fbfbf'}
            editable={false}
          />
        </View>

        <View className='rounded-2xl border border-primary-200 bg-primary-800 p-4 mb-5'>
          <Text className='text-primary-100 text-lg mb-2'>Импорт CSV</Text>
          <View className='flex-row gap-2 mb-2'>
            <Pressable onPress={() => setDedupeMode('word')} className={`px-3 py-2 rounded-xl border ${dedupeMode==='word' ? 'bg-primary-700 border-accent-600' : 'border-primary-300'}`}>
              <Text className='text-primary-100 text-xs'>Дедуп: слово</Text>
            </Pressable>
            <Pressable onPress={() => setDedupeMode('word+translation')} className={`px-3 py-2 rounded-xl border ${dedupeMode==='word+translation' ? 'bg-primary-700 border-accent-600' : 'border-primary-300'}`}>
              <Text className='text-primary-100 text-xs'>слово+перевод</Text>
            </Pressable>
          </View>
          <TextInput
            className='w-full p-3 text-white rounded-xl bg-primary-300 border border-primary-200'
            style={{ minHeight: 160, textAlignVertical: 'top' }}
            multiline
            value={importText}
            onChangeText={setImportText}
            placeholder='Вставьте CSV...'
            placeholderTextColor={'#9fbfbf'}
          />
          <View className='flex-row gap-3 mt-3'>
            <View className='flex-1'><Button title='Проверить' variant='secondary' onPress={analyzeImport} /></View>
            <View className='flex-1'><Button title='Импортировать' onPress={() => setConfirmVisible(true)} /></View>
          </View>
          {importStats && (
            <Text className='text-primary-100 opacity-80 mt-2 text-xs'>Строк: {importStats.total}; Добавить: {importStats.toAdd}; Дубликаты: {importStats.duplicates}</Text>
          )}
        </View>
      </ScrollView>

      <View style={{ position: 'absolute', left: 20, right: 20, bottom: bottomInset, zIndex: 20, elevation: 20 }}>
        <Button title='Выбрать словарь' variant='secondary' onPress={() => setPickerVisible(true)} />
      </View>

      <DictionaryPicker visible={pickerVisible} onClose={() => setPickerVisible(false)} onSelect={() => setPickerVisible(false)} />

      <ConfirmDialog
        visible={confirmVisible}
        title='Импортировать CSV?'
        message='Будут добавлены отсутствующие слова в выбранный словарь.'
        confirmText='Импортировать'
        cancelText='Отмена'
        onCancel={() => setConfirmVisible(false)}
        onConfirm={performImport}
      />

      <Toast visible={toastVisible} message={toastMessage} type={toastType} position='top' onHide={() => setToastVisible(false)} />
    </KeyboardAvoidingView>
  );
};

export default CsvScreen;

