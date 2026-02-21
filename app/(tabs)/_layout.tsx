import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';
import theme from '@/constants/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarLabelStyle: {
          fontSize: 12,
          marginTop: 2,
        },
        tabBarItemStyle: {
          paddingVertical: 0,
        },
        tabBarStyle: {
          backgroundColor: theme.colors.tabBar,
          borderTopWidth: 0,
          elevation: 0,
          height: 62,
          paddingTop: 6,
          paddingBottom: 6,
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
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="list.bullet" color={theme.colors.text} />,
        }}
      />
      <Tabs.Screen
        name="card"
        options={{
          title: 'Card',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="creditcard.fill" color={theme.colors.text} />,
        }}
      />
      <Tabs.Screen
        name="add"
        options={{
          title: 'Add',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="plus.circle.fill" color={theme.colors.text} />,
          unmountOnBlur: true,
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: 'Library',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="folder.fill" color={theme.colors.text} />,
        }}
      />
      <Tabs.Screen
        name="csv"
        options={{
          title: 'CSV',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="arrow.up.arrow.down.circle.fill" color={theme.colors.text} />,
        }}
      />
      <Tabs.Screen
        name="quiz"
        options={{
          title: 'Quiz',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="paperplane.fill" color={theme.colors.text} />,
        }}
      />
      <Tabs.Screen
        name="repeat"
        options={{
          title: 'Repeat',
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="arrow.clockwise" color={theme.colors.text} />,
        }}
      />
    </Tabs>
  );
}
