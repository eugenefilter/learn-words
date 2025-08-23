import React, { useEffect, useRef, useState } from 'react';
import { Animated, PanResponder, StyleSheet, View } from 'react-native';

interface FlipCardProps {
  front: React.ReactNode;
  back: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}

export const FlipCard = ({ front, back, onSwipeLeft, onSwipeRight }: FlipCardProps) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const [flipped, setFlipped] = useState(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchStartTime = useRef(0);

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

  const rotateY = animatedValue.interpolate({
    inputRange: [0, 180],
    outputRange: ['0deg', '180deg'],
  });

  const frontOpacity = animatedValue.interpolate({
    inputRange: [0, 90],
    outputRange: [1, 0],
  });

  const backOpacity = animatedValue.interpolate({
    inputRange: [90, 180],
    outputRange: [0, 1],
  });

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
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 5 || Math.abs(gesture.dy) > 5,
      onPanResponderGrant: (_, gesture) => {
        touchStartX.current = gesture.x0;
        touchStartY.current = gesture.y0;
        touchStartTime.current = Date.now();
      },
      onPanResponderRelease: (_, gesture) => {
        const dx = gesture.moveX - touchStartX.current;
        const dy = gesture.moveY - touchStartY.current;
        const dt = Date.now() - touchStartTime.current;

        // Horizontal swipe
        if (Math.abs(dx) >= 50 && Math.abs(dy) < 40) {
          if (dx < 0) onSwipeLeftRef.current && onSwipeLeftRef.current();
          else onSwipeRightRef.current && onSwipeRightRef.current();
          return;
        }

        // Tap to flip (short, minimal movement)
        const isTap = dt < 250 && Math.abs(dx) < 8 && Math.abs(dy) < 8;
        if (isTap) {
          if (flipped) flipToFront();
          else flipToBack();
        }
      },
    })
  ).current;

  return (
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
            // styles.cardBack,
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
