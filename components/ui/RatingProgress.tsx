import React from 'react';
import { View } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import theme from '@/constants/theme';

type RatingProgressProps = {
  rating: number;
  size?: 'sm' | 'md';
};

const MAX_ARROWS = 5;

const paletteByRating = (rating: number) => {
  if (rating >= 2) {
    return {
      active: theme.colors.success,
      inactive: 'rgba(34, 197, 94, 0.22)',
      border: 'rgba(34, 197, 94, 0.38)',
      background: 'rgba(34, 197, 94, 0.08)',
    };
  }
  if (rating === 1) {
    return {
      active: theme.colors.warning,
      inactive: 'rgba(250, 204, 21, 0.22)',
      border: 'rgba(250, 204, 21, 0.38)',
      background: 'rgba(250, 204, 21, 0.08)',
    };
  }
  return {
    active: theme.colors.danger,
    inactive: 'rgba(239, 68, 68, 0.2)',
    border: 'rgba(239, 68, 68, 0.34)',
    background: 'rgba(239, 68, 68, 0.08)',
  };
};

const RatingProgress: React.FC<RatingProgressProps> = ({ rating, size = 'sm' }) => {
  const safeRating = Math.max(0, Math.min(2, Math.trunc(Number.isFinite(rating) ? rating : 0)));
  const filled = Math.round((safeRating / 2) * (MAX_ARROWS - 1)) + 1;
  const palette = paletteByRating(safeRating);

  const iconSize = size === 'md' ? 9 : 7;
  const containerPaddingX = size === 'md' ? 3 : 2;
  const containerPaddingY = size === 'md' ? 2 : 1;
  const overlap = size === 'md' ? -3 : -2;

  return (
    <View
      className='rounded-lg flex-row items-center'
      style={{
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: palette.background,
        paddingHorizontal: containerPaddingX,
        paddingVertical: containerPaddingY,
      }}
    >
      {Array.from({ length: MAX_ARROWS }).map((_, index) => (
        <View key={index} style={{ marginLeft: index === 0 ? 0 : overlap }}>
          <ChevronRight
            size={iconSize}
            strokeWidth={3}
            color={index < filled ? palette.active : palette.inactive}
          />
        </View>
      ))}
      <View style={{ width: 1 }} />
    </View>
  );
};

export default React.memo(RatingProgress);
