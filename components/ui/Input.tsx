import clsx from 'clsx';
import { TextInput } from 'react-native'

type CustomTextInputProps = {
  value: string;
  placeholder: string;
  className?: string;
  onChangeText: (text: string) => void;
  placeholderTextColor?: string;
};

const Input = ({
  value,
  placeholder,
  onChangeText,
  className,
  ...props
}: CustomTextInputProps) => {

  const textClass = clsx(
    'w-full p-4 text-xl text-white rounded-xl bg-primary-300 border border-primary-200',
    className
  )

  return (
    <TextInput
      className={textClass}
      value={value}
      placeholder={placeholder}
      onChangeText={onChangeText}
      placeholderTextColor={props.placeholderTextColor ?? '#9fbfbf'}
      {...props}
    />
  )
}

export default Input
