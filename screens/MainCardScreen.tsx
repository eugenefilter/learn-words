import { Pressable, View, Text, ActivityIndicator, TextInput, Platform } from 'react-native'
import React, { useEffect, useState } from 'react'
import { CardModel } from '@/models/CardModel';
import { TCard } from '@/types/TCard';
import FlipCardNavigator from '@/components/card/FlipCardNavigator';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { IconSymbol } from '@/components/ui/IconSymbol';
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { useAppContext } from '@/context/AppContext'
import EmptyState from '@/components/ui/EmptyState'
import * as Haptics from 'expo-haptics'
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { FLOATING_PANEL_GAP } from '@/constants/layout';
import theme from '@/constants/theme';
import { DictionarySelector } from '@/components/dictionary';
import { Swipeable } from 'react-native-gesture-handler';
import { Pencil, Trash2 } from 'lucide-react-native';

const MainCardScreen = () => {
  const router = useRouter();
  const { currentDictionaryId } = useAppContext();
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const [search, setSearch] = useState('')
  const [card, setCard] = useState<TCard | null>(null)
  const [loading, setLoading] = useState(true)
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [confirmVisible, setConfirmVisible] = useState(false)
  const [navPanelHeight, setNavPanelHeight] = useState(0)
  const [searchOpen, setSearchOpen] = useState(false)

  const navBottomOffset = Platform.OS === 'ios'
    ? tabBarHeight + FLOATING_PANEL_GAP
    : FLOATING_PANEL_GAP;
  const cardContentBottomPadding = navPanelHeight + navBottomOffset + (Platform.OS === 'ios' ? insets.bottom : 0) + 12;
  const cardContentTopPadding = searchOpen ? 72 : 0;

  useEffect(() => {
    const loadById = async () => {
      setLoading(true)
      if (id && typeof id === 'string') {
        const found = await CardModel.findById(parseInt(id, 10))
        if (found) {
          setCard(found)
          // Не перезаписываем ввод пользователя, если он уже что-то печатал
          setSearch((prev) => (prev && prev.length > 0 ? prev : found.word))
        }
      } else {
        // Если пришли без id (вкладка открыта напрямую) — подгрузим первую карточку
        const first = await CardModel.firstCard(currentDictionaryId || undefined)
        if (first) {
          setCard(first)
          setSearch((prev) => (prev && prev.length > 0 ? prev : first.word))
        }
      }
      setLoading(false)
    }
    loadById()
  }, [id, currentDictionaryId])

  const searchCardHandler = async (text: string) => {
    setSearch(text)
    const searchResult = await CardModel.findByWord(text, currentDictionaryId || undefined)
    setCard(searchResult)
  }

  const handleSwipeLeft = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (card !== null) {
      const prev = await CardModel.prevCard(card.id, currentDictionaryId || undefined)
      if (prev !== null) {
        setCard(prev)
      } else {
        const last = await CardModel.lastCard(currentDictionaryId || undefined)
        if (last) setCard(last)
      }
    }
  }

  const handleSwipeRight = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (card !== null) {
      const next = await CardModel.nextCard(card.id, currentDictionaryId || undefined)
      if (next !== null) {
        setCard(next)
      } else {
        const first = await CardModel.firstCard(currentDictionaryId || undefined)
        if (first) setCard(first)
      }
    }
  }

  const handleEdit = () => {
    if (!card) return;
    router.push({ pathname: '/edit', params: { id: card.id.toString() } });
  }

  const handleDelete = () => {
    if (!card) return;
    setConfirmVisible(true)
  }

  const confirmDelete = async () => {
    if (!card) return
    const currentId = card.id
    await CardModel.delete(currentId)
    setConfirmVisible(false)
    const next = await CardModel.nextCard(currentId, currentDictionaryId || undefined)
    if (next) {
      setCard(next)
      setSearch(next.word)
      return
    }
    const prev = await CardModel.prevCard(currentId, currentDictionaryId || undefined)
    if (prev) {
      setCard(prev)
      setSearch(prev.word)
      return
    }
    setCard(null)
    setSearch('')
  }

  const openSearch = () => {
    setSearchOpen(true)
  }

  const closeSearch = () => {
    setSearchOpen(false)
    setSearch(card?.word || '')
  }

  const renderLeftActions = () => (
    <View
      style={{
        width: 56,
        marginTop: 24,
        marginBottom: 0,
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      <Pressable
        onPress={handleEdit}
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2a3f5f' }}
      >
        <Pencil size={24} color='#d9ebeb' />
      </Pressable>
    </View>
  );

  const renderRightActions = () => (
    <View
      style={{
        width: 56,
        marginTop: 24,
        marginBottom: 0,
        borderRadius: 12,
        overflow: 'hidden',
      }}
    >
      <Pressable
        onPress={handleDelete}
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ef4444' }}
      >
        <Trash2 size={24} color='#ffffff' />
      </Pressable>
    </View>
  );

  return (
    <View className='bg-primary-900 flex-1 relative'>
      {!searchOpen && (
        <View className='px-4 pt-3 flex-row items-center justify-between'>
          <DictionarySelector buttonClassName='mr-3' />
          <Pressable
            onPress={openSearch}
            hitSlop={10}
            className='w-10 h-10 rounded-xl border border-primary-300 items-center justify-center'
            style={{ zIndex: 40, elevation: 40 }}
          >
            <IconSymbol name='magnifyingglass' size={18} color='#d9ebeb' />
          </Pressable>
        </View>
      )}

      <View
        className='flex-1'
        style={card ? { paddingTop: cardContentTopPadding, paddingBottom: cardContentBottomPadding } : undefined}
      >
        {loading ? (
          <View className='flex-1 items-center justify-center'>
            <ActivityIndicator size='large' color='#d9ebeb' />
          </View>
        ) : card ? (
          <Swipeable
            containerStyle={{ flex: 1 }}
            childrenContainerStyle={{ flex: 1 }}
            renderLeftActions={renderLeftActions}
            renderRightActions={renderRightActions}
            leftThreshold={24}
            rightThreshold={24}
            overshootLeft={false}
            overshootRight={false}
            friction={3.2}
          >
            <View style={{ flex: 1 }}>
              <FlipCardNavigator
                card={card}
              />
            </View>
          </Swipeable>
        ) : (
          <EmptyState
            icon='rectangle.on.rectangle'
            title='Карточек нет'
            subtitle='Добавьте первую карточку на вкладке «+»'
          />
        )}
      </View>

      <ConfirmDialog 
        visible={confirmVisible}
        title='Удалить карточку'
        message='Вы уверены, что хотите удалить эту карточку?'
        confirmText='Удалить'
        cancelText='Отмена'
        onCancel={() => setConfirmVisible(false)}
        onConfirm={confirmDelete}
      />

      {card && (
        <View
          style={{ position: 'absolute', left: 0, right: 0, bottom: navBottomOffset }}
          className='px-4'
          onLayout={(e) => setNavPanelHeight(e.nativeEvent.layout.height)}
        >
          <View className='flex-row items-center justify-between gap-4'>
            <Pressable 
              onPress={handleSwipeLeft} 
              className='flex-1 rounded-2xl flex-row items-center justify-center border border-primary-200'
              style={{ aspectRatio: 2 }}
            >
              <IconSymbol name='chevron.left' size={30} color={'#d9ebeb'} />
              <Text className='text-primary-100 text-2xl ml-3'>Назад</Text>
            </Pressable>
            <Pressable 
              onPress={handleSwipeRight} 
              className='flex-1 rounded-2xl flex-row items-center justify-center bg-primary-300' 
              style={{ aspectRatio: 2 }}
            >
              <Text className='text-white text-2xl mr-3'>Далее</Text>
              <IconSymbol name='chevron.right' size={30} color={'#ffffff'} />
            </Pressable>
          </View>
        </View>
      )}

      {searchOpen && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 60,
            elevation: 60,
            paddingTop: 12,
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
              onChangeText={searchCardHandler}
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
  )
}

export default MainCardScreen;
