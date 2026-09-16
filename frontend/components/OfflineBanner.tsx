import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t } from '@/services/i18n';
import { useIsOnline } from '@/services/network';

export function OfflineBanner() {
  const insets = useSafeAreaInsets();
  const online = useIsOnline();
  if (online) return null;

  return (
    <View
      pointerEvents="none"
      className="absolute left-4 right-4 z-50 items-center rounded-full px-4 py-2"
      style={{ top: insets.top + 8, backgroundColor: '#26332D' }}>
      <Text className="text-xs font-semibold text-white">{t('common.offlineBanner')}</Text>
    </View>
  );
}
