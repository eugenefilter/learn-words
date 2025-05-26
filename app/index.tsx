import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import CardListScreen from '@/screens/CardListScreen';

export default function App() {
  return (
    <SafeAreaProvider>
      <SafeAreaView className='flex-1 bg-primary-900'>
        <CardListScreen />
      </SafeAreaView>
    </SafeAreaProvider>
  ); 
}