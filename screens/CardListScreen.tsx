import { useRouter } from 'expo-router'
import { useFocusEffect } from '@react-navigation/native'
import { useState, useCallback, useEffect } from 'react'
import { View, Text, Pressable, FlatList, ScrollView, ActivityIndicator } from 'react-native'
import { CardModel } from '@/models/CardModel'
import { TCard } from '@/types/TCard'
import Card from '@/components/card/Card'
import SearchInput from '@/components/ui/SearchInput'
import useDebounce from '@/utils/useDebounce'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { useAppContext } from '@/context/AppContext'
import { LanguageModel } from '@/models/LanguageModel'
import { DictionaryModel } from '@/models/DictionaryModel'
import EmptyState from '@/components/ui/EmptyState'
const CardListScreen = () => {
  const router = useRouter()
  const { currentLanguageId, setCurrentLanguageId, currentDictionaryId, setCurrentDictionaryId } = useAppContext()
  const [cards, setCards] = useState<TCard[]>([])
  const [visibleCards, setVisibleCards] = useState<TCard[]>([])
  const [search, setSearch] = useState('')
  const [sortMode, setSortMode] = useState<'none'|'asc'|'desc'>('none')
  const [hiddenRatings, setHiddenRatings] = useState<Set<number>>(new Set())
  const [confirmVisible, setConfirmVisible] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null)
  const [languages, setLanguages] = useState<{ id: number; name: string }[]>([])
  const [dicts, setDicts] = useState<{ id: number; name: string }[]>([])
  const [loading, setLoading] = useState(true)

  const applyFilters = useCallback((list: TCard[]) => {
    let result = list
    if (hiddenRatings.size > 0) {
      result = result.filter(c => !hiddenRatings.has(c.rating ?? 0))
    }
    if (sortMode !== 'none') {
      result = [...result].sort((a, b) => {
        const ra = a.rating ?? 0
        const rb = b.rating ?? 0
        return sortMode === 'asc' ? ra - rb : rb - ra
      })
    }
    setVisibleCards(result)
  }, [hiddenRatings, sortMode])

  const loadContext = useCallback(async () => {
    const langs = await LanguageModel.all();
    setLanguages(langs)
    const lid = currentLanguageId ?? langs[0]?.id
    if (lid) {
      if (!currentLanguageId) setCurrentLanguageId(lid)
      const d = await DictionaryModel.allByLanguage(lid)
      setDicts(d)
      if (!currentDictionaryId && d[0]?.id) setCurrentDictionaryId(d[0].id)
    }
  }, [currentLanguageId, currentDictionaryId, setCurrentLanguageId, setCurrentDictionaryId])

  const loadCards = useCallback(async () => {
    setLoading(true)
    const list = await CardModel.all(20, 0, currentDictionaryId || undefined);
    setCards(list);
    applyFilters(list)
    setLoading(false)
  }, [currentDictionaryId, applyFilters])

  const findCards = useCallback(async (value: string) => {
    setLoading(true)
    const result = await CardModel.find(value, currentDictionaryId || undefined)
    setCards(result)
    applyFilters(result)
    setLoading(false)
  }, [currentDictionaryId, applyFilters])

  const requestDelete = useCallback((id: number) => {
    setPendingDeleteId(id)
    setConfirmVisible(true)
  }, [])

  const confirmDelete = useCallback(async () => {
    if (pendingDeleteId === null) return
    await CardModel.delete(pendingDeleteId)
    setConfirmVisible(false)
    setPendingDeleteId(null)
    loadCards()
  }, [pendingDeleteId, loadCards])

  useFocusEffect(
    useCallback(() => {
      loadContext();
      loadCards();
    }, [loadContext, loadCards])
  )

  const debouncedSearch = useDebounce(search, 500)

  useEffect(() => {
    findCards(debouncedSearch)
  }, [debouncedSearch, findCards])

  // Перефильтровать текущие карточки при смене фильтров/сортировки (без запроса к БД)
  useEffect(() => {
    applyFilters(cards)
  }, [applyFilters]) // eslint-disable-line react-hooks/exhaustive-deps

  // Перезагрузить карточки при смене словаря (намеренно только currentDictionaryId,
  // чтобы не триггерить лишний запрос к БД при смене фильтров)
  useEffect(() => {
    loadCards()
  }, [currentDictionaryId]) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleRatingHidden = (r: number) => {
    setHiddenRatings(prev => {
      const next = new Set(prev)
      if (next.has(r)) next.delete(r)
      else next.add(r)
      return next
    })
  }

  const cycleSort = () => {
    setSortMode(prev => prev === 'none' ? 'asc' : prev === 'asc' ? 'desc' : 'none')
  }

  return (
    <View className='flex-1 bg-primary-900'>
      <View className='px-4 pt-2'>
        <View className='flex-row items-center justify-between mb-2'>
          <Text className='text-primary-100 text-lg'>Список</Text>
          <View className='flex-row gap-2'>
            <Pressable onPress={() => router.push('/quiz')} className='px-3 py-2 rounded-xl border border-primary-300'>
              <Text className='text-primary-100 text-xs'>QUIZ</Text>
            </Pressable>
            <Pressable onPress={() => router.push('/csv')} className='px-3 py-2 rounded-xl border border-primary-300'>
              <Text className='text-primary-100 text-xs'>CSV</Text>
            </Pressable>
          </View>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className='mt-2'>
          <View className='flex-row gap-2'>
            {dicts.map(d => (
              <Pressable key={d.id} onPress={() => setCurrentDictionaryId(d.id)} className={`px-3 py-2 rounded-xl border ${currentDictionaryId===d.id ? 'bg-primary-700 border-accent-600' : 'border-primary-300'}`}>
                <Text className='text-primary-100 text-xs'>{d.name}</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>
      <SearchInput 
        value={search}
        placeholder="Search word ..."
        onChangeText={setSearch}
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className='mt-2 px-4' style={{ flexGrow: 0 }}>
        <View className='flex-row gap-2'>
          <Pressable onPress={cycleSort} className='px-3 py-2 rounded-xl border border-primary-300'>
            <Text className='text-primary-100'>Сортировка: {sortMode === 'none' ? 'выкл' : sortMode === 'asc' ? 'по возр.' : 'по убыв.'}</Text>
          </Pressable>
          <Pressable onPress={() => toggleRatingHidden(0)} className={`px-3 py-2 rounded-xl border ${hiddenRatings.has(0) ? 'bg-primary-700 border-accent-600' : 'border-primary-300'}`}>
            <Text className='text-primary-100'>Не знаю</Text>
          </Pressable>
          <Pressable onPress={() => toggleRatingHidden(1)} className={`px-3 py-2 rounded-xl border ${hiddenRatings.has(1) ? 'bg-primary-700 border-accent-600' : 'border-primary-300'}`}>
            <Text className='text-primary-100'>Плохо</Text>
          </Pressable>
          <Pressable onPress={() => toggleRatingHidden(2)} className={`px-3 py-2 rounded-xl border ${hiddenRatings.has(2) ? 'bg-primary-700 border-accent-600' : 'border-primary-300'}`}>
            <Text className='text-primary-100'>Хорошо</Text>
          </Pressable>
        </View>
      </ScrollView>

      {loading ? (
        <View className='flex-1 items-center justify-center'>
          <ActivityIndicator size='large' color='#d9ebeb' />
        </View>
      ) : (
      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 16, flexGrow: 1 }}
        data={visibleCards}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <Card
            card={item}
            onDelete={requestDelete}
            onEdit={(id) => router.push({ pathname: '/edit', params: { id: id.toString() } })}
            onPress={() => router.push({ pathname: '/card', params: { id: item.id.toString() } })}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon='tray'
            title='Карточек нет'
            subtitle='Добавьте первую карточку на вкладке «+»'
          />
        }
      />
      )}

      <ConfirmDialog
        visible={confirmVisible}
        title='Удалить карточку'
        message='Вы уверены, что хотите удалить эту карточку?'
        confirmText='Удалить'
        cancelText='Отмена'
        onCancel={() => { setConfirmVisible(false); setPendingDeleteId(null) }}
        onConfirm={confirmDelete}
      />
    </View>
  );
}

export default CardListScreen;
