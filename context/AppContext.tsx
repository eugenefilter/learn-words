import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LanguageModel } from '@/models/LanguageModel';
import { DictionaryModel } from '@/models/DictionaryModel';

const STORAGE_KEY_LANGUAGE = 'app:currentLanguageId';
const STORAGE_KEY_DICTIONARY = 'app:currentDictionaryId';

type AppContextState = {
  currentLanguageId: number | null;
  currentDictionaryId: number | null;
  setCurrentLanguageId: (id: number) => void;
  setCurrentDictionaryId: (id: number) => void;
};

const AppContext = createContext<AppContextState | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentLanguageId, setCurrentLanguageIdState] = useState<number | null>(null);
  const [currentDictionaryId, setCurrentDictionaryIdState] = useState<number | null>(null);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const [savedLang, savedDict] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY_LANGUAGE),
          AsyncStorage.getItem(STORAGE_KEY_DICTIONARY),
        ]);

        const langId = savedLang
          ? parseInt(savedLang, 10)
          : await LanguageModel.firstOrCreateDefault();

        setCurrentLanguageIdState(langId);

        const dictId = savedDict
          ? parseInt(savedDict, 10)
          : await DictionaryModel.firstOrCreateDefaultForLanguage(langId);

        setCurrentDictionaryIdState(dictId);
      } catch (e) {
        setInitError(e instanceof Error ? e.message : String(e));
      }
    };
    init();
  }, []);

  const setCurrentLanguageId = useCallback((id: number) => {
    setCurrentLanguageIdState(id);
    AsyncStorage.setItem(STORAGE_KEY_LANGUAGE, String(id));
  }, []);

  const setCurrentDictionaryId = useCallback((id: number) => {
    setCurrentDictionaryIdState(id);
    AsyncStorage.setItem(STORAGE_KEY_DICTIONARY, String(id));
  }, []);

  if (initError) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#102222', padding: 24 }}>
        <Text style={{ color: '#ef4444', fontSize: 18, marginBottom: 8 }}>Ошибка инициализации</Text>
        <Text style={{ color: '#d9ebeb', opacity: 0.7, textAlign: 'center' }}>{initError}</Text>
      </View>
    );
  }

  const value: AppContextState = {
    currentLanguageId,
    currentDictionaryId,
    setCurrentLanguageId,
    setCurrentDictionaryId,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppContext must be used within AppProvider');
  return ctx;
};
