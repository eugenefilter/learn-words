import { View } from 'react-native'
import { IconSymbol } from './IconSymbol';
import Input from './Input';

type CustomTextInputProps = {
  value: string;
  placeholder: string;
  handleChangeText: (text: string) => void;
};

const SearchInput = ({
  value,
  placeholder,
  handleChangeText,
  ...props
}: CustomTextInputProps) => {
  return (
    <View className='flex-row items-center rounded-lg p-5 m-5 bg-primary-300'>
      <IconSymbol size={28} name="magnifyingglass" color='#d9ebeb' />
      <Input 
        className="flex-1 mx-2 p-0 text-white text-xl"
        value={value}
        placeholder="Search word ..."
        handleChangeText={handleChangeText}
      />      
    </View>
  )
}

export default SearchInput