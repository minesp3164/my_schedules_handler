import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { t } from '@/services/i18n';

// 로딩·오류·재시도를 화면마다 똑같이 그리기 위한 공용 상태 컴포넌트.
// 사용자가 "무엇이 없나"와 "어떻게 되돌리나"를 한 화면에서 바로 알 수 있게 한다.

export function LoadingBlock({ label, style }: { label?: string; style?: StyleProp<ViewStyle> }) {
  const message = label ?? t('common.loading');
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={message}
      style={style}
      className="flex-row items-center rounded-2xl border border-hairline bg-surface px-4 py-5">
      <ActivityIndicator size="small" color="#6F7D75" />
      <Text className="ml-3 text-[13px] text-meta">{message}</Text>
    </View>
  );
}

export function ErrorRetry({
  message,
  onRetry,
  label,
  style,
}: {
  message?: string | null;
  onRetry: () => void;
  label?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const detail = message?.trim() ? message : t('common.requestFailed');
  return (
    <View style={style} className="rounded-2xl border border-hairline bg-surface px-4 py-4">
      <Text accessibilityRole="alert" className="text-[13px] leading-5 text-[#C44B5D]">
        {detail}
      </Text>
      <Pressable
        onPress={onRetry}
        accessibilityRole="button"
        accessibilityLabel={label ?? t('common.retry')}
        className="mt-3 min-h-11 items-center justify-center rounded-xl bg-ink px-4">
        <Text className="text-[13px] font-bold text-white">{label ?? t('common.retry')}</Text>
      </Pressable>
    </View>
  );
}
