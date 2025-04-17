export type TCard = {
  id: number;
  word: string;
  translation: string;
  examples: TExample[];
  show?: boolean;
};

export type TExample = {
  id: number;
  sentence: string;
}