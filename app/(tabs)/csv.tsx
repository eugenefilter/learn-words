import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, TextInput, View, Pressable, Share } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useAppContext } from '@/context/AppContext';
import DictionaryPicker from '@/components/library/DictionaryPicker';
import Button from '@/components/ui/Button';
import Toast from '@/components/ui/Toast';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { CardModel } from '@/models/CardModel';

type DedupeMode = 'word' | 'word+translation';

type ParsedImportRow = {
  word: string;
  translation: string;
  transcription: string | null;
  rating: number;
  examples: string[];
};

type ParseResult = {
  rows: ParsedImportRow[];
  previewRows: ParsedImportRow[];
  format: 'CSV' | 'TSV';
  hasHeader: boolean;
};

const CsvScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { currentDictionaryId, setCurrentDictionaryId } = useAppContext();

  // Picker state
  const [pickerVisible, setPickerVisible] = useState(false);

  // Export state
  const [exportCsv, setExportCsv] = useState('');
  const [saving, setSaving] = useState(false);

  // Import state
  const [importText, setImportText] = useState('');
  const [dedupeMode, setDedupeMode] = useState<DedupeMode>('word');
  const [importStats, setImportStats] = useState<{ total: number; toAdd: number; duplicates: number } | null>(null);
  const [importing, setImporting] = useState(false);
  const [previewRows, setPreviewRows] = useState<ParsedImportRow[]>([]);
  const [detectedFormat, setDetectedFormat] = useState<'CSV' | 'TSV' | null>(null);
  const [detectedHeader, setDetectedHeader] = useState<boolean>(false);

  // UI feedback
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success'|'error'|'info'>('info');
  const [confirmVisible, setConfirmVisible] = useState(false);

  const bottomInset = (tabBarHeight || 0) + insets.bottom + 12;

  const parseDelimitedLine = (line: string, delimiter: string): string[] => {
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (line[i + 1] === '"') {
            cur += '"';
            i += 1;
          } else {
            inQuotes = false;
          }
        } else {
          cur += ch;
        }
      } else if (ch === delimiter) {
        result.push(cur.trim());
        cur = '';
      } else if (ch === '"') {
        inQuotes = true;
      } else {
        cur += ch;
      }
    }

    result.push(cur.trim());
    return result;
  };

  const normalizeHeader = (value: string): string => value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '')
    .replace(/_/g, '');

  const parseImportRows = (rawText: string): ParseResult => {
    const lines = rawText
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      return { rows: [], previewRows: [], format: 'CSV', hasHeader: false };
    }

    const delimiter = lines[0].includes('\t') ? '\t' : ',';
    const format: 'CSV' | 'TSV' = delimiter === '\t' ? 'TSV' : 'CSV';

    const split = (line: string) => parseDelimitedLine(line, delimiter);
    const firstCells = split(lines[0]);
    const firstHeaders = firstCells.map(normalizeHeader);

    const hasWordHeader = firstHeaders.includes('word');
    const hasTranslationHeader = firstHeaders.some((h) => ['translation', 'translate', 'meaning', 'перевод'].includes(h));
    const hasHeader = hasWordHeader && hasTranslationHeader;

    const indexByCandidates = (headers: string[], candidates: string[], fallback: number): number => {
      const found = headers.findIndex((h) => candidates.includes(h));
      return found >= 0 ? found : fallback;
    };

    const wordIndex = hasHeader ? indexByCandidates(firstHeaders, ['word', 'слово'], 0) : 0;
    const translationIndex = hasHeader ? indexByCandidates(firstHeaders, ['translation', 'translate', 'meaning', 'перевод'], 1) : 1;
    const transcriptionIndex = hasHeader ? indexByCandidates(firstHeaders, ['transcription', 'phonetic', 'pronunciation', 'транскрипция'], 2) : 2;
    const examplesIndex = hasHeader ? indexByCandidates(firstHeaders, ['examples', 'example', 'примеры', 'пример'], 4) : 4;
    const ratingIndex = hasHeader ? indexByCandidates(firstHeaders, ['rating', 'rank', 'уровень', 'рейтинг'], 3) : 3;

    const startIndex = hasHeader ? 1 : 0;
    const rows: ParsedImportRow[] = [];

    for (let i = startIndex; i < lines.length; i += 1) {
      const cells = split(lines[i]);
      const word = (cells[wordIndex] || '').trim();
      const translation = (cells[translationIndex] || '').trim();

      if (!word || !translation) continue;

      const transcription = (cells[transcriptionIndex] || '').trim() || null;
      const rawExamples = (cells[examplesIndex] || '').trim();
      const examples = rawExamples
        ? rawExamples.split(/\s*[;|]\s*/).map((v) => v.trim()).filter(Boolean)
        : [];

      const rawRating = Number.parseInt((cells[ratingIndex] || '0').trim(), 10);
      const rating = CardModel.clampRating(Number.isNaN(rawRating) ? 0 : rawRating);

      rows.push({ word, translation, transcription, rating, examples });
    }

    return {
      rows,
      previewRows: rows.slice(0, 8),
      format,
      hasHeader,
    };
  };

  const buildCsv = async () => {
    if (!currentDictionaryId) {
      setToastType('error'); setToastMessage('Выберите словарь для экспорта'); setToastVisible(true);
      return;
    }
    try {
      const cards = await CardModel.allWithExamplesByDictionary(currentDictionaryId);
      const header = 'word,translation,transcription,rating,examples';
      const rows = cards.map(c => {
        const ex = (c.examples || []).map(e => e.sentence.replace(/\n/g, ' ')).join('; ');
        const cells = [c.word, c.translation, c.transcription ?? '', String(c.rating ?? 0), ex];
        return cells.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(',');
      });
      const csv = [header, ...rows].join('\n');
      setExportCsv(csv);
      return csv;
    } catch (e) {
      setToastType('error'); setToastMessage('Ошибка экспорта'); setToastVisible(true);
      return '';
    }
  };

  const exportToFile = async () => {
    try {
      const csv = exportCsv.trim() ? exportCsv : (await buildCsv()) || '';
      if (!csv) return;
      setSaving(true);
      await Share.share({
        title: 'Vocab Export CSV',
        message: csv,
      });
      setToastType('success');
      setToastMessage('CSV готов. Выберите, куда отправить текст.');
      setToastVisible(true);
    } catch (e) {
      setToastType('error');
      setToastMessage('Не удалось поделиться CSV');
      setToastVisible(true);
    } finally {
      setSaving(false);
    }
  };

  const analyzeImport = async (sourceText?: string) => {
    if (!currentDictionaryId) {
      setToastType('error');
      setToastMessage('Выберите словарь для импорта');
      setToastVisible(true);
      return;
    }

    const text = (sourceText ?? importText).trim();
    if (!text) {
      setImportStats(null);
      setPreviewRows([]);
      setDetectedFormat(null);
      setDetectedHeader(false);
      return;
    }

    const parsed = parseImportRows(text);
    setPreviewRows(parsed.previewRows);
    setDetectedFormat(parsed.format);
    setDetectedHeader(parsed.hasHeader);

    if (parsed.rows.length === 0) {
      setImportStats({ total: 0, toAdd: 0, duplicates: 0 });
      return;
    }

    let total = 0;
    let toAdd = 0;
    let duplicates = 0;

    for (const row of parsed.rows) {
      total += 1;
      const exists = dedupeMode === 'word'
        ? await CardModel.existsInDictionary(row.word, currentDictionaryId)
        : await CardModel.existsByWordAndTranslation(row.word, row.translation, currentDictionaryId);
      if (exists) duplicates += 1;
      else toAdd += 1;
    }

    setImportStats({ total, toAdd, duplicates });
  };

  const performImport = async () => {
    if (!currentDictionaryId) {
      setToastType('error');
      setToastMessage('Выберите словарь для импорта');
      setToastVisible(true);
      return;
    }

    const text = importText.trim();
    if (!text) return;

    try {
      setImporting(true);
      const parsed = parseImportRows(text);
      if (parsed.rows.length === 0) {
        setToastType('info');
        setToastMessage('Нет валидных строк для импорта');
        setToastVisible(true);
        setConfirmVisible(false);
        return;
      }

      let added = 0;
      let skipped = 0;

      for (const row of parsed.rows) {
        const exists = dedupeMode === 'word'
          ? await CardModel.existsInDictionary(row.word, currentDictionaryId)
          : await CardModel.existsByWordAndTranslation(row.word, row.translation, currentDictionaryId);

        if (exists) {
          skipped += 1;
          continue;
        }

        await CardModel.create(
          row.word,
          row.translation,
          row.transcription,
          row.examples,
          row.rating,
          currentDictionaryId
        );

        added += 1;
      }

      setToastType('success');
      setToastMessage(`Импорт: добавлено ${added}, пропущено ${skipped}`);
      setToastVisible(true);
      setConfirmVisible(false);
    } catch (e) {
      setToastType('error');
      setToastMessage('Ошибка импорта');
      setToastVisible(true);
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = async () => {
    try {
      const template = [
        'word,translation,transcription,rating,examples',
        '"stick","придерживаться","/stɪk/","1","Stick to the plan.; We stick together."',
      ].join('\n');
      await Share.share({
        title: 'Vocab Template CSV',
        message: template,
      });
      setToastType('success');
      setToastMessage('Шаблон отправлен. Сохраните его как .csv в нужном приложении.');
      setToastVisible(true);
    } catch (e) {
      setToastType('error');
      setToastMessage('Не удалось отправить шаблон');
      setToastVisible(true);
    }
  };

  const pickCsvFile = async () => {
    setToastType('info');
    setToastMessage('Импорт из файла пока недоступен в этой сборке. Вставьте данные из Excel/CSV в поле ниже.');
    setToastVisible(true);
  };

  return (
    <KeyboardAvoidingView className='flex-1 bg-primary-900' behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ paddingBottom: bottomInset }} className='flex-1 px-5 pt-6'>
        <Pressable onPress={() => setPickerVisible(true)} className='mb-4 px-3 py-3 rounded-xl border border-primary-200 bg-primary-300'>
          <Text className='text-primary-100'>Словарь для импорта/экспорта: {currentDictionaryId ? `#${currentDictionaryId}` : 'не выбран'}</Text>
          <Text className='text-primary-100 opacity-80 text-xs mt-1'>Нажмите, чтобы выбрать существующий или создать новый</Text>
        </Pressable>

        <View className='rounded-2xl border border-primary-200 bg-primary-800 p-4 mb-5'>
          <Text className='text-primary-100 text-lg mb-2'>Экспорт</Text>
          <Button title={saving ? 'Сохранение…' : 'Экспорт в файл'} disabled={saving} onPress={exportToFile} />
          <Text className='text-primary-100 opacity-80 mt-3 text-xs'>Формат: word, translation, transcription, rating, examples</Text>
        </View>

        <View className='rounded-2xl border border-primary-200 bg-primary-800 p-4 mb-5'>
          <Text className='text-primary-100 text-lg mb-2'>Импорт (Excel/CSV)</Text>

          <View className='mb-3 rounded-xl border border-primary-300 px-3 py-3 bg-primary-900'>
            <Text className='text-primary-100 text-xs mb-1'>Как подготовить данные:</Text>
            <Text className='text-primary-100 opacity-80 text-xs'>1. Колонки по порядку: word, translation, transcription, rating, examples</Text>
            <Text className='text-primary-100 opacity-80 text-xs'>2. Обязательные: word и translation</Text>
            <Text className='text-primary-100 opacity-80 text-xs'>3. examples: несколько примеров через ;</Text>
            <Text className='text-primary-100 opacity-80 text-xs'>4. rating: 0..2 (если пусто, будет 0)</Text>
            <Text className='text-primary-100 opacity-80 text-xs mt-1'>Можно вставлять прямо из Excel (таблицу), CSV и TSV поддерживаются.</Text>
          </View>

          <View className='flex-row gap-3 mb-2'>
            <View className='flex-1'>
              <Button title='Скачать шаблон CSV' onPress={downloadTemplate} />
            </View>
            <View className='flex-1'>
              <Button title='Выбрать файл' onPress={pickCsvFile} />
            </View>
          </View>

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
            style={{ minHeight: 180, textAlignVertical: 'top' }}
            multiline
            value={importText}
            onChangeText={(value) => {
              setImportText(value);
              setImportStats(null);
              setPreviewRows([]);
              setDetectedFormat(null);
              setDetectedHeader(false);
            }}
            placeholder='Вставьте данные из Excel/CSV сюда...'
            placeholderTextColor={'#9fbfbf'}
          />

          <View className='flex-row gap-3 mt-3'>
            <View className='flex-1'><Button title='Проверить' variant='secondary' onPress={() => analyzeImport()} /></View>
            <View className='flex-1'><Button title={importing ? 'Импорт...' : 'Импортировать'} disabled={importing} onPress={() => setConfirmVisible(true)} /></View>
          </View>

          {importStats && (
            <Text className='text-primary-100 opacity-80 mt-2 text-xs'>
              Формат: {detectedFormat || '-'}; Заголовок: {detectedHeader ? 'есть' : 'нет'}; Строк: {importStats.total}; Добавить: {importStats.toAdd}; Дубликаты: {importStats.duplicates}
            </Text>
          )}

          {previewRows.length > 0 && (
            <View className='mt-3 rounded-xl border border-primary-300 p-3 bg-primary-900'>
              <Text className='text-primary-100 text-xs mb-2'>Превью первых строк:</Text>
              {previewRows.map((row, index) => (
                <Text key={`${row.word}-${row.translation}-${index}`} className='text-primary-100 opacity-80 text-xs mb-1'>
                  {index + 1}. {row.word} -> {row.translation} {row.transcription ? `(${row.transcription})` : ''}
                </Text>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <DictionaryPicker
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelect={(id) => {
          setCurrentDictionaryId(id);
          setPickerVisible(false);
        }}
      />

      <ConfirmDialog
        visible={confirmVisible}
        title='Импортировать данные?'
        message='Будут добавлены только отсутствующие записи в выбранный словарь.'
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
