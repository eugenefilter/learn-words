import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View, TouchableWithoutFeedback } from 'react-native';

interface FlipCardProps {
  front: React.ReactNode;
  back: React.ReactNode;
}

export const FlipCard = ({ front, back }: FlipCardProps) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const [flipped, setFlipped] = useState(false);
  useEffect(() => {
    // reset to front side when card content changes
    setFlipped(false);
    animatedValue.setValue(0);
  }, [front, back, animatedValue]);

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

  return (
    <View className='flex-1'>
      <TouchableWithoutFeedback onPress={() => (flipped ? flipToFront() : flipToBack())}>
        <View style={styles.fill}>
          <Animated.View
            className="flex flex-col gap-5 h-full"
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
    </View>
  );
};

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  card: {
    backfaceVisibility: 'hidden',
  },
});
