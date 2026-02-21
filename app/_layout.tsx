import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { initDatabase } from '@/database/database';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import '../global.css';
import { AppProvider } from '@/context/AppContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import theme from '@/constants/theme';

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    SplashScreen.preventAutoHideAsync();
    initDatabase()
      .then(() => {
        setIsReady(true);
        SplashScreen.hideAsync();
      })
      .catch(console.error);
  }, []);

  if (!isReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style='light' backgroundColor={theme.colors.background} />
        <SafeAreaView className='flex-1' style={{ backgroundColor: theme.colors.background }}>
          <ErrorBoundary>
            <AppProvider>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="edit" />
              </Stack>
            </AppProvider>
          </ErrorBoundary>
        </SafeAreaView>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
