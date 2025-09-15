import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';
import { useEffect, useState } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import { initDatabase } from '@/database/database';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import "../global.css"

export default function Layout() {
const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    SplashScreen.preventAutoHideAsync();
    initDatabase()
      .then(() => {
        console.log('DB init');
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
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarStyle: {
              backgroundColor: '#102222',
              borderTopWidth: 0, // опционально, убирает линию сверху
              elevation: 0,       // для Android: убирает тень
              position: Platform.select({
                ios: 'absolute',
                default: 'relative',
              }),
            },
          }}
        >
          <Tabs.Screen
            name="index"
            options={{
              title: 'Home',
              tabBarIcon: ({ color }) => <IconSymbol size={28} name="list.bullet" color='#d9ebeb' />,
            }}
          />
          <Tabs.Screen
            name="card"
            options={{
              title: 'Card',
              tabBarIcon: ({ color }) => <IconSymbol size={28} name="creditcard.fill" color='#d9ebeb' />,
            }}
          />
          <Tabs.Screen  
            name="add"
            options={{
              title: 'Add',
              tabBarIcon: ({ color }) => <IconSymbol size={28} name="plus.circle.fill" color='#d9ebeb' />,
              // Reset form state when leaving the tab
              unmountOnBlur: true,
            }}
          />
        </Tabs>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
