import { Pressable, Text, View } from 'react-native';
import { t } from '@/services/i18n';
import { useTheme } from '@/services/theme';

// 미달성 배지 숨김/전체 보기 토글. 스위치 모양 버튼이다.
export function LockedToggle({
  showLocked,
  lockedCount,
  onToggle,
}: {
  showLocked: boolean;
  lockedCount: number;
  onToggle: () => void;
}) {
  const { palette } = useTheme();
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: showLocked }}
      accessibilityLabel={t('footprint.screen.showLockedAccessibility')}
      onPress={onToggle}
      className="mt-3.5 flex-row items-center justify-between rounded-2xl border bg-white px-4 py-3"
      style={{ borderColor: '#E4EAE3' }}>
      <View className="mr-3 flex-1">
        <Text className="text-[13.5px] font-bold text-[#303B34]">
          {t('footprint.screen.showLocked')}{' '}
          <Text style={{ color: '#B4BCB3' }}>
            {t('footprint.screen.lockedCount', { count: lockedCount })}
          </Text>
        </Text>
        <Text className="mt-[3px] text-[11px] text-[#A2ABA2]">
          {t('footprint.screen.hiddenHint')}
        </Text>
      </View>
      <View
        style={{
          width: 46,
          height: 27,
          borderRadius: 99,
          padding: 3,
          justifyContent: 'center',
          backgroundColor: showLocked ? palette.accent : '#D7DDD6',
        }}>
        <View
          style={{
            width: 21,
            height: 21,
            borderRadius: 99,
            backgroundColor: '#fff',
            alignSelf: showLocked ? 'flex-end' : 'flex-start',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.2,
            shadowRadius: 3,
            elevation: 2,
          }}
        />
      </View>
    </Pressable>
  );
}
