import React, { useEffect, useRef } from 'react'
import { Animated, Easing, Text, ViewStyle } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

type ToastProps = {
  visible: boolean
  message: string
  type?: 'success' | 'error' | 'info'
  duration?: number
  position?: 'top' | 'bottom'
  onHide?: () => void
}

const bgByType: Record<NonNullable<ToastProps['type']>, string> = {
  success: '#0d9488', // teal-600 close to accent
  error: '#dc2626',   // red-600
  info: '#334155',    // slate-700
}

const Toast = ({
  visible,
  message,
  type = 'info',
  duration = 1800,
  position = 'top',
  onHide,
}: ToastProps) => {
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;
  const translate = useRef(new Animated.Value(position === 'top' ? -10 : 10)).current;

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(translate, { toValue: 0, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]).start();
      timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, { toValue: 0, duration: 160, easing: Easing.in(Easing.quad), useNativeDriver: true }),
          Animated.timing(translate, { toValue: position === 'top' ? -10 : 10, duration: 160, easing: Easing.in(Easing.quad), useNativeDriver: true }),
        ]).start(() => onHide && onHide());
      }, duration);
    }
    return () => { if (timer) clearTimeout(timer) };
  }, [visible, duration, onHide, opacity, translate, position]);

  if (!visible) return null;

  const containerStyle: ViewStyle = {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 50,
  };
  if (position === 'top') containerStyle.top = (insets.top || 0) + 12;
  else containerStyle.bottom = (insets.bottom || 0) + 12;

  return (
    <Animated.View
      style={[
        containerStyle,
        {
          opacity,
          transform: [{ translateY: translate }],
          backgroundColor: bgByType[type],
          borderRadius: 12,
          paddingVertical: 10,
          paddingHorizontal: 14,
          shadowColor: '#000',
          shadowOpacity: 0.25,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 3 },
          elevation: 8,
        },
      ]}
    >
      <Text style={{ color: 'white', fontSize: 15, textAlign: 'center' }}>{message}</Text>
    </Animated.View>
  )
}

export default Toast

