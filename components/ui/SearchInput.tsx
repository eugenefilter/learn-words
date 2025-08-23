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
    <View className='flex-row items-center rounded-xl py-3 px-4 m-5 bg-primary-300 border border-primary-200'>
      <IconSymbol size={22} name="magnifyingglass" color='#d9ebeb' />
      <Input 
        className="flex-1 ml-2 p-0 text-white text-xl bg-transparent border-0"
        value={value}
        placeholder={placeholder}
        onChangeText={onChangeText}
        placeholderTextColor='#9fbfbf'
      />      
    </View>
  )
}

export default SearchInput
