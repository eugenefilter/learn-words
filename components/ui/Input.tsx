import clsx from 'clsx';
import { TextInput } from 'react-native'

type CustomTextInputProps = {
  value: string;
  placeholder: string;
  className?: string;
  handleChangeText: (text: string) => void;
};

const Input = ({
  value,
  placeholder,
  handleChangeText,
  className,
  ...props
}: CustomTextInputProps) => {

  const textClass = clsx(
    'w-full p-4 text-xl text-white border border-primary-300 rounded-lg bg-primary-300',
    className
  )

  return (
    // <View className='m-4 bg-transparent w-full'>
      <TextInput
        className={textClass}
        value={value}
        placeholder={placeholder}
        onChangeText={handleChangeText}
        {...props}
      />
    // </View>
  )
}

export default Input