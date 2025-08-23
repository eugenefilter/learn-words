// FlipCardNavigator.tsx
import React from 'react';
import { FlipCard } from './FlipCard';
import FrontCard from './FrontCard';
import BackCard from './BackCard';
import { TCard } from '@/types/TCard';

interface FlipCardNavigatorProps {
  card: TCard;
  onSwipeLeft: () => void;
  onSwipeRight: () => void;
}

const FlipCardNavigator: React.FC<FlipCardNavigatorProps> = ({
  card,
  onSwipeLeft,
  onSwipeRight,
}) => {
  return (
    <FlipCard
      front={<FrontCard card={card} />}
      back={<BackCard card={card} />}
      onSwipeLeft={onSwipeLeft}
      onSwipeRight={onSwipeRight}
    />
  );
};

export default FlipCardNavigator;
