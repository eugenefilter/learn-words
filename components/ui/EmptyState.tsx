import { View, Text } from 'react-native';
import { IconSymbol } from '@/components/ui/IconSymbol';

type EmptyStateProps = {
  icon?: string;
  title: string;
  subtitle?: string;
};

export default function EmptyState({ icon = 'tray', title, subtitle }: EmptyStateProps) {
  return (
    <View className='flex-1 items-center justify-center gap-3 px-8'>
      <IconSymbol name={icon as any} size={48} color='#4a7a7a' />
      <Text className='text-primary-100 text-xl text-center'>{title}</Text>
      {subtitle ? (
        <Text className='text-primary-100 opacity-50 text-sm text-center'>{subtitle}</Text>
      ) : null}
    </View>
  );
}
