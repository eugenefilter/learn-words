import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { initDatabase } from '@/database/database';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import '../global.css';
import { AppProvider } from '@/context/AppContext';
import { ErrorBoundary } from '@/components/ErrorBoundary';

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
    <SafeAreaProvider>
      <SafeAreaView className='flex-1 bg-primary-900'>
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
  );
}
