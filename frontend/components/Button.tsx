import { forwardRef } from 'react';
import { Text, TouchableOpacity, type TouchableOpacityProps, type View } from 'react-native';

interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'quiet' | 'danger';
  size?: 'default' | 'compact';
}

export const Button = forwardRef<View, ButtonProps>(
  (
    { title, variant = 'primary', size = 'default', className, disabled, ...touchableProps },
    ref
  ) => {
    const appearance = styles.variants[variant];
    const height = styles.sizes[size];

    return (
      <TouchableOpacity
        ref={ref}
        accessibilityRole="button"
        disabled={disabled}
        {...touchableProps}
        className={`${styles.base} ${height} ${appearance.button} ${disabled ? 'opacity-40' : ''} ${className ?? ''}`}>
        <Text className={`${styles.label} ${appearance.label}`}>{title}</Text>
      </TouchableOpacity>
    );
  }
);

Button.displayName = 'Button';

const styles = {
  base: 'items-center justify-center rounded-2xl px-4 transition duration-150 active:opacity-75',
  label: 'text-center text-sm font-bold',
  sizes: {
    default: 'min-h-12 py-3',
    compact: 'min-h-11 py-2',
  },
  variants: {
    primary: {
      button: 'bg-lavender shadow-sm',
      label: 'text-white',
    },
    secondary: {
      button: 'border border-line bg-surface',
      label: 'text-[#26332D]',
    },
    quiet: {
      button: 'bg-transparent',
      label: 'text-muted',
    },
    danger: {
      button: 'bg-[#FFF1F1]',
      label: 'text-[#C44949]',
    },
  },
};
