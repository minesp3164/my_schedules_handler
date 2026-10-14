import { type ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

export function RowDivider() {
  return <View className="h-px bg-line" style={{ marginLeft: 16 }} />;
}

export type SettingRowProps = {
  label: string;
  value?: string;
  chevron?: boolean;
  muted?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  right?: ReactNode;
};

export function SettingRow({
  label,
  value,
  chevron,
  muted,
  disabled,
  onPress,
  right,
}: SettingRowProps) {
  const body = (
    <View className="flex-row items-center justify-between px-4 py-4">
      <Text
        className={
          muted
            ? 'text-[15px] font-semibold text-muted'
            : 'text-[15px] font-semibold text-[#26332D]'
        }>
        {label}
      </Text>
      <View className="flex-row items-center gap-2">
        {value ? <Text className="text-sm text-muted">{value}</Text> : null}
        {right}
        {chevron ? <Text className="text-lg text-muted">›</Text> : null}
      </View>
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress}>
      {body}
    </Pressable>
  );
}
