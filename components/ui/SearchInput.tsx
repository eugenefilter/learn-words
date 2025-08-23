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
    <View className='flex-row items-center rounded-lg py-1 px-3 m-5 bg-primary-300'>
      <IconSymbol size={28} name="magnifyingglass" color='#d9ebeb' />
      <Input 
        className="flex-1 mx-1 p-0 text-white text-xl"
        value={value}
        placeholder={placeholder}
        onChangeText={onChangeText}
      />      
    </View>
  )
}

export default SearchInput
