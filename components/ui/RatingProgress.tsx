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

const RatingProgress: React.FC<RatingProgressProps> = ({ rating, size = 'sm' }) => {
  const safeRating = Math.max(0, Math.min(2, Math.trunc(Number.isFinite(rating) ? rating : 0)));
  const color = colorByRating(safeRating);

  const barWidth = size === 'md' ? 72 : 56;
  const barHeight = size === 'md' ? 8 : 6;
  const bracketSize = size === 'md' ? 13 : 11;
  const bracketSlotWidth = size === 'md' ? 12 : 10;
  const gap = size === 'md' ? 4 : 3;
  const trackBorderWidth = 1;
  const trackPaddingX = 4;
  const trackInnerWidth = barWidth - trackPaddingX * 2 - trackBorderWidth * 2;
  const segmentWidth = (trackInnerWidth - gap * 2) / 3;

  return (
    <View className='flex-row items-center'>
      <View style={{ width: bracketSlotWidth, alignItems: 'center' }}>
        <Text style={{ color, fontSize: bracketSize, lineHeight: bracketSize }}>[</Text>
      </View>
      <View
        className='rounded-md bg-primary-300/20'
        style={{
          width: barWidth,
          height: barHeight + 2,
          borderWidth: trackBorderWidth,
          borderColor: 'rgba(99,124,161,0.4)',
          paddingHorizontal: trackPaddingX,
        }}
      >
        <View className='h-full flex-row items-center'>
          {[0, 1, 2].map((step) => (
            <View
              key={step}
              className='rounded-sm'
              style={{
                width: segmentWidth,
                height: barHeight - 2,
                marginRight: step < 2 ? gap : 0,
                backgroundColor: step <= safeRating ? color : 'rgba(217,235,235,0.18)',
              }}
            />
          ))}
        </View>
      </View>
      <View style={{ width: bracketSlotWidth, alignItems: 'center' }}>
        <Text style={{ color, fontSize: bracketSize, lineHeight: bracketSize }}>]</Text>
      </View>
    </View>
  );
};

export default RatingProgress;
