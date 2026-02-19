import React, { useEffect, useRef, useState } from 'react';
import { Animated, PanResponder, StyleSheet, View, TouchableWithoutFeedback } from 'react-native';

interface FlipCardProps {
  front: React.ReactNode;
  back: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}

export const FlipCard = ({ front, back, onSwipeLeft, onSwipeRight }: FlipCardProps) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const [flipped, setFlipped] = useState(false);

  // Keep latest handlers to avoid stale closures inside PanResponder
  const onSwipeLeftRef = useRef(onSwipeLeft);
  const onSwipeRightRef = useRef(onSwipeRight);
  useEffect(() => { onSwipeLeftRef.current = onSwipeLeft; }, [onSwipeLeft]);
  useEffect(() => { onSwipeRightRef.current = onSwipeRight; }, [onSwipeRight]);

  const flipToFront = () => {
    Animated.timing(animatedValue, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setFlipped(false));
  };

  const flipToBack = () => {
    Animated.timing(animatedValue, {
      toValue: 180,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setFlipped(true));
  };

  const frontInterpolate = animatedValue.interpolate({
    inputRange: [0, 180],
    outputRange: ['0deg', '180deg'],
  });
  
  const backInterpolate = animatedValue.interpolate({
    inputRange: [0, 180],
    outputRange: ['180deg', '360deg'],
  });

  // Handle swipe and tap (flip) without conflicts
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 15 && Math.abs(g.dx) > Math.abs(g.dy),
      onPanResponderRelease: (_, g) => {
        const dx = g.dx;
        const dy = g.dy;

        // Horizontal swipe when clear enough
        if (Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(dy) * 1.5) {
          if (dx < 0) onSwipeLeftRef.current && onSwipeLeftRef.current();
          else onSwipeRightRef.current && onSwipeRightRef.current();
        }
      },
    })
  ).current;

  return (
      <TouchableWithoutFeedback onPress={() => (flipped ? flipToFront() : flipToBack())}>
        <View className='w-full h-full' {...panResponder.panHandlers}>
        <Animated.View
          className="flex flex-col gap-5"
          style={[
            styles.card,
            {
              transform: [{ rotateY: frontInterpolate }],
              zIndex: flipped ? 0 : 1,
            },
          ]}
        >
          {front}
        </Animated.View>
        <Animated.View
          style={[
            styles.card,
            {
              transform: [{ rotateY: backInterpolate }],
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: flipped ? 1 : 0,
            },
          ]}
        >
          {back}
        </Animated.View>
        </View>
      </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  card: {
    backfaceVisibility: 'hidden',
  },
  cardBack: {
    backgroundColor: '#E7E0EC',
  },
});
