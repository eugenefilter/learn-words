import { useRouter } from 'expo-router'
import { useFocusEffect } from '@react-navigation/native'
import { useState, useCallback, useEffect } from 'react'
import { View, Text, Pressable, ScrollView, ActivityIndicator, FlatList, TextInput } from 'react-native'
import { CardModel } from '@/models/CardModel'
import { TCard } from '@/types/TCard'
import Card from '@/components/card/Card'
import useDebounce from '@/utils/useDebounce'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { useAppContext } from '@/context/AppContext'
import { LanguageModel } from '@/models/LanguageModel'
import { DictionaryModel } from '@/models/DictionaryModel'
import EmptyState from '@/components/ui/EmptyState'
import { IconSymbol } from '@/components/ui/IconSymbol'
import theme from '@/constants/theme'

const HEADER_HEIGHT = 64

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
  const [searchOpen, setSearchOpen] = useState(false)

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

  const openSearch = () => {
    setSearchOpen(true)
  }

  const closeSearch = () => {
    setSearchOpen(false)
    setSearch('')
    loadCards()
  }

  return (
    <View className='flex-1 bg-primary-900'>
      <View
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          zIndex: 20,
        }}
      >
        {!searchOpen && (
          <View className='bg-primary-900'>
            <View className='px-4 pt-3'>
              <View className='flex-row items-center justify-between mb-2'>
                <View className='flex-1 mr-3'>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }}>
                    <View className='flex-row gap-2'>
                      {dicts.map(d => (
                        <Pressable key={d.id} onPress={() => setCurrentDictionaryId(d.id)} className={`px-3 py-2 rounded-xl border ${currentDictionaryId===d.id ? 'bg-primary-700 border-accent-600' : 'border-primary-300'}`}>
                          <Text className='text-primary-100 text-xs'>{d.name}</Text>
                        </Pressable>
                      ))}
                    </View>
                  </ScrollView>
                </View>
                <Pressable
                  onPress={openSearch}
                  hitSlop={10}
                  className='w-10 h-10 rounded-xl border border-primary-300 items-center justify-center'
                  style={{ zIndex: 40, elevation: 40 }}
                >
                  <IconSymbol name='magnifyingglass' size={18} color='#d9ebeb' />
                </Pressable>
              </View>
            </View>
          </View>
        )}
      </View>

      {loading ? (
        <View className='flex-1 items-center justify-center' style={{ paddingTop: HEADER_HEIGHT }}>
          <ActivityIndicator size='large' color='#d9ebeb' />
        </View>
      ) : (
      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: HEADER_HEIGHT, paddingBottom: 16, flexGrow: 1 }}
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
        removeClippedSubviews
        maxToRenderPerBatch={10}
        windowSize={10}
        initialNumToRender={15}
        ListHeaderComponent={(
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className='px-4' style={{ flexGrow: 0 }}>
            <View className='flex-row gap-2 pb-2 pt-2'>
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

      {searchOpen && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 60,
            elevation: 60,
            paddingTop: 6,
            paddingHorizontal: 16,
            paddingBottom: 8,
            backgroundColor: theme.colors.background,
          }}
        >
          <View
            className='h-16 flex-row items-center bg-primary-300 border border-primary-200'
            style={{ width: '100%', borderRadius: 24, overflow: 'hidden', paddingLeft: 12, paddingRight: 14 }}
          >
            <IconSymbol name='magnifyingglass' size={18} color='#d9ebeb' />
            <TextInput
              autoFocus
              value={search}
              onChangeText={setSearch}
              placeholder='Поиск карточек'
              placeholderTextColor={theme.colors.textMuted}
              style={{ width: 0, flexGrow: 1, flexShrink: 1, marginLeft: 24, color: '#d9ebeb', fontSize: 16 }}
            />
            <Pressable onPress={closeSearch} className='ml-3 px-1 py-1'>
              <Text className='text-primary-100 text-2xl'>×</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

export default CardListScreen;
