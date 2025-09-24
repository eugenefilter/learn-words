import React, { createContext, useContext, useEffect, useState } from 'react';
import { LanguageModel } from '@/models/LanguageModel';
import { DictionaryModel } from '@/models/DictionaryModel';

type AppContextState = {
  currentLanguageId: number | null;
  currentDictionaryId: number | null;
  setCurrentLanguageId: (id: number) => void;
  setCurrentDictionaryId: (id: number) => void;
};

const AppContext = createContext<AppContextState | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentLanguageId, setCurrentLanguageId] = useState<number | null>(null);
  const [currentDictionaryId, setCurrentDictionaryId] = useState<number | null>(null);

  useEffect(() => {
    // Ensure default language and dictionary exist, and set them
    const ensureDefaults = async () => {
      const langId = await LanguageModel.firstOrCreateDefault();
      setCurrentLanguageId(langId);
      const dictId = await DictionaryModel.firstOrCreateDefaultForLanguage(langId);
      setCurrentDictionaryId(dictId);
    };
    ensureDefaults();
  }, []);

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

