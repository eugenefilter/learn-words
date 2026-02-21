import React from 'react';
import { Text, View } from 'react-native';
import theme from '@/constants/theme';

type RatingProgressProps = {
  rating: number;
  size?: 'sm' | 'md';
};

const colorByRating = (rating: number): string => {
  if (rating >= 2) return theme.colors.success;
  if (rating === 1) return theme.colors.warning;
  return theme.colors.danger;
};

const progressByRating = (rating: number): number => {
  if (rating >= 2) return 100;
  if (rating === 1) return 60;
  return 25;
};

const RatingProgress: React.FC<RatingProgressProps> = ({ rating, size = 'sm' }) => {
  const safeRating = Math.max(0, Math.min(2, Math.trunc(Number.isFinite(rating) ? rating : 0)));
  const color = colorByRating(safeRating);
  const progress = progressByRating(safeRating);

  const barWidth = size === 'md' ? 72 : 56;
  const barHeight = size === 'md' ? 2.5 : 1.5;
  const bracketSize = size === 'md' ? 13 : 11;

  return (
    <View className='flex-row items-center'>
      <Text style={{ color, fontSize: bracketSize, lineHeight: bracketSize }} className='mr-1'>[</Text>
      <View
        className='rounded-sm overflow-hidden bg-primary-300/30 border border-primary-300/40'
        style={{ width: barWidth, height: barHeight }}
      >
        <View className='h-full' style={{ width: `${progress}%`, backgroundColor: color }} />
      </View>
      <Text style={{ color, fontSize: bracketSize, lineHeight: bracketSize }} className='ml-1'>]</Text>
    </View>
  );
};

export default RatingProgress;
