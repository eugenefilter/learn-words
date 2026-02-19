import { View } from 'react-native'
import { IconSymbol } from './IconSymbol';
import Input from './Input';

type CustomTextInputProps = {
  value: string;
  placeholder: string;
  onChangeText: (text: string) => void;
};

const SearchInput = ({
  value,
  placeholder,
  onChangeText,
  ...props
}: CustomTextInputProps) => {
  return (
    <View className='flex-row items-center rounded-xl py-1 px-4 mx-4 my-2 bg-primary-300 border border-primary-200'>
      <IconSymbol size={18} name="magnifyingglass" color='#d9ebeb' />
      <Input
        className="flex-1 ml-2 p-0 text-white text-base bg-transparent border-0"
        value={value}
        placeholder={placeholder}
        onChangeText={onChangeText}
        placeholderTextColor='#9fbfbf'
      />      
    </View>
  )
}

export default SearchInput
