export const RATING = {
  NONE: 0,
  BAD: 1,
  GOOD: 2,
} as const;

export const RATING_ICON: Record<number, string> = {
  [RATING.NONE]: 'battery.0',
  [RATING.BAD]:  'battery.50',
  [RATING.GOOD]: 'battery.100',
};

export const RATING_COLOR: Record<number, string> = {
  [RATING.NONE]: '#ef4444',
  [RATING.BAD]:  '#f59e0b',
  [RATING.GOOD]: '#22c55e',
};
