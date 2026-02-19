/** Raw SQLite row shape — column names match the DB schema */
export type CardRow = {
  id: number;
  word: string;
  translation: string;
  transcription: string | null;
  explanation: string | null;
  rating: number | null;
  dictionary_id: number;
};

export type TCard = {
  id: number;
  word: string;
  translation: string;
  transcription?: string;
  explanation?: string;
  rating?: number;
  dictionaryId?: number; // optional for backward-compat mapping
  examples: TExample[];
  show?: boolean;
};

export type TExample = {
  id: number;
  sentence: string;
}
