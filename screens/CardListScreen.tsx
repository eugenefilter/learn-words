import { useRouter } from 'expo-router'
import { useFocusEffect } from '@react-navigation/native'
import { useState, useCallback, useEffect, useRef } from 'react'
import { View, Text, Pressable, ScrollView, ActivityIndicator, FlatList, TextInput } from 'react-native'
import { CardModel } from '@/models/CardModel'
import { TCard } from '@/types/TCard'
import Card from '@/components/card/Card'
import useDebounce from '@/utils/useDebounce'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { useAppContext } from '@/context/AppContext'
import EmptyState from '@/components/ui/EmptyState'
import { IconSymbol } from '@/components/ui/IconSymbol'
import theme from '@/constants/theme'
import { DictionarySelector } from '@/components/dictionary'

const HEADER_CONTENT_HEIGHT = 64
const PAGE_SIZE = 20

const CardListScreen = () => {
  const router = useRouter()
  const { currentDictionaryId } = useAppContext()
  const [cards, setCards] = useState<TCard[]>([])
  const [visibleCards, setVisibleCards] = useState<TCard[]>([])
  const [search, setSearch] = useState('')
  const [sortMode, setSortMode] = useState<'none'|'asc'|'desc'>('none')
  const [hiddenRatings, setHiddenRatings] = useState<Set<number>>(new Set())
  const [confirmVisible, setConfirmVisible] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [focusCount, setFocusCount] = useState(0)
  const requestIdRef = useRef(0)
  const debouncedSearch = useDebounce(search, 500)

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

  const loadFirstPage = useCallback(async (query: string) => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    try {
      const q = query.trim();
      const firstPage = q.length > 0
        ? await CardModel.find(q, currentDictionaryId || undefined, PAGE_SIZE, 0)
        : await CardModel.all(PAGE_SIZE, 0, currentDictionaryId || undefined);

      if (requestId !== requestIdRef.current) return;
      setCards(firstPage);
      setPage(1);
      setHasMore(firstPage.length === PAGE_SIZE);
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  }, [currentDictionaryId]);

  const loadMoreCards = useCallback(async () => {
    if (loading || loadingMore || !hasMore) return;
    const q = debouncedSearch.trim();
    const offset = page * PAGE_SIZE;
    setLoadingMore(true);
    try {
      const nextPage = q.length > 0
        ? await CardModel.find(q, currentDictionaryId || undefined, PAGE_SIZE, offset)
        : await CardModel.all(PAGE_SIZE, offset, currentDictionaryId || undefined);

      setCards((prev) => {
        if (nextPage.length === 0) return prev;
        const seen = new Set(prev.map((c) => c.id));
        const merged = [...prev];
        for (const item of nextPage) {
          if (!seen.has(item.id)) merged.push(item);
        }
        return merged;
      });
      setPage((prev) => prev + 1);
      setHasMore(nextPage.length === PAGE_SIZE);
    } finally {
      setLoadingMore(false);
    }
  }, [loading, loadingMore, hasMore, debouncedSearch, page, currentDictionaryId]);

  const requestDelete = useCallback((id: number) => {
    setPendingDeleteId(id)
    setConfirmVisible(true)
  }, [])

  const confirmDelete = useCallback(async () => {
    if (pendingDeleteId === null) return
    await CardModel.delete(pendingDeleteId)
    setConfirmVisible(false)
    setPendingDeleteId(null)
    await loadFirstPage(debouncedSearch)
  }, [pendingDeleteId, loadFirstPage, debouncedSearch])

  useFocusEffect(
    useCallback(() => {
      setFocusCount((c) => c + 1);
    }, [])
  )

  // Единственное место вызова loadFirstPage — реагирует на смену поиска и фокуса экрана
  useEffect(() => {
    if (focusCount === 0) return;
    loadFirstPage(debouncedSearch)
  }, [focusCount, debouncedSearch, loadFirstPage])

  // Перефильтровать текущие карточки при смене фильтров/сортировки (без запроса к БД)
  useEffect(() => {
    applyFilters(cards)
  }, [cards, applyFilters])

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
    loadFirstPage('')
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
                <View className='mr-3'>
                  <DictionarySelector />
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
        <View className='flex-1 items-center justify-center' style={{ paddingTop: HEADER_CONTENT_HEIGHT }}>
          <ActivityIndicator size='large' color='#d9ebeb' />
        </View>
      ) : (
      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: HEADER_CONTENT_HEIGHT, paddingBottom: 16, flexGrow: 1 }}
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
        onEndReached={loadMoreCards}
        onEndReachedThreshold={0.35}
        ListFooterComponent={loadingMore ? (
          <View className='py-4'>
            <ActivityIndicator size='small' color='#d9ebeb' />
          </View>
        ) : null}
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
