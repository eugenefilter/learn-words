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
  onEdit?: () => void;
  onDelete?: () => void;
}

const FlipCardNavigator: React.FC<FlipCardNavigatorProps> = ({
  card,
  onSwipeLeft,
  onSwipeRight,
  onEdit,
  onDelete,
}) => {
  return (
    <FlipCard
      key={card.id}
      front={<FrontCard card={card} onEdit={onEdit} onDelete={onDelete} />}
      back={<BackCard card={card} onEdit={onEdit} onDelete={onDelete} />}
      onSwipeLeft={onSwipeLeft}
      onSwipeRight={onSwipeRight}
    />
  );
};

export default FlipCardNavigator;
