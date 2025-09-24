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
