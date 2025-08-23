// FlipCardNavigator.tsx
import React from 'react';
import { Dimensions } from 'react-native';
import GestureRecognizer from 'react-native-swipe-gestures';
import { FlipCard } from './FlipCard';
import FrontCard from './FrontCard';
import BackCard from './BackCard';
import { TCard } from '@/types/TCard';

interface FlipCardNavigatorProps {
  card: TCard;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const FlipCardNavigator: React.FC<FlipCardNavigatorProps> = ({
  card,
  onSwipeLeft,
  onSwipeRight,
}) => {
  // Конфигурация «порога» для свайпов
  const gestureConfig = {
    velocityThreshold: 0.3,
    directionalOffsetThreshold: SCREEN_WIDTH * 0.15,
  };

  return (
    <GestureRecognizer
      onSwipeLeft={onSwipeLeft}
      onSwipeRight={onSwipeRight}
      config={gestureConfig}
    >
      <FlipCard
        front={<FrontCard card={card} />}
        back={<BackCard card={card} />}
      />
    </GestureRecognizer>
  );
};

export default FlipCardNavigator;
