import clsx from 'clsx';
import { TextInput } from 'react-native'

type CustomTextInputProps = {
  value: string;
  placeholder: string;
  className?: string;
  onChangeText: (text: string) => void;
};

const Input = ({
  value,
  placeholder,
  onChangeText,
  className,
  ...props
}: CustomTextInputProps) => {

  const textClass = clsx(
    'w-full p-4 text-xl text-white border border-primary-300 rounded-lg bg-primary-300',
    className
  )

  return (
    <TextInput
      className={textClass}
      value={value}
      placeholder={placeholder}
      onChangeText={onChangeText}
      {...props}
    />
  )
}

export default Input