export type TCard = {
  id: number;
  word: string;
  translation: string;
  transcription?: string;
  explanation?: string;
  rating?: number;
  examples: TExample[];
  show?: boolean;
};

export type TExample = {
  id: number;
  sentence: string;
}
