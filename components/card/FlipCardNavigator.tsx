// FlipCardNavigator.tsx
import React from 'react';
import { FlipCard } from './FlipCard';
import FrontCard from './FrontCard';
import BackCard from './BackCard';
import { TCard } from '@/types/TCard';

interface FlipCardNavigatorProps {
  card: TCard;
}

const FlipCardNavigator: React.FC<FlipCardNavigatorProps> = ({
  card,
}) => {
  return (
    <FlipCard
      key={card.id}
      front={<FrontCard card={card} />}
      back={<BackCard card={card} />}
    />
  );
};

export default FlipCardNavigator;
