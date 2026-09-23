import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t } from '@/services/i18n';
import { dismissOfflineFailures, useOfflineQueueStats } from '@/services/offline-queue';
import { useIsOnline } from '@/services/network';

export function OfflineBanner() {
  const insets = useSafeAreaInsets();
  const online = useIsOnline();
  const { pending, failedCount } = useOfflineQueueStats();
  if (online && pending === 0 && failedCount === 0) return null;

  // 실패 알림이 가장 시급하고, 그다음이 오프라인 대기, 재접송 중에는 전송 안내.
  const message =
    failedCount > 0
      ? t('common.offlineQueueFailed', { count: failedCount })
      : !online
        ? pending > 0
          ? t('common.offlineQueuedOffline', { count: pending })
          : t('common.offlineBanner')
        : t('common.offlineQueued', { count: pending });
  const background = failedCount > 0 ? '#C44B5D' : '#26332D';

  return (
    <View
      pointerEvents="box-none"
      className="absolute left-4 right-4 z-50 flex-row items-center rounded-full px-4 py-2"
      style={{ top: insets.top + 8, backgroundColor: background }}>
      <Text pointerEvents="none" className="flex-1 text-xs font-semibold text-white">
        {message}
      </Text>
      {failedCount > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.dismiss')}
          onPress={() => void dismissOfflineFailures()}
          hitSlop={8}
          className="min-h-8 min-w-8 items-center justify-center">
          <Text className="text-xs font-bold text-white">✕</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
