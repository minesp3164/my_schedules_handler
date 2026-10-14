import { Modal, Pressable, Text, View } from 'react-native';
import type { Badge, MilestoneProgress } from '@/services/api';
import { achievementReason, formatBadgeDate, formatMetric } from '@/services/badges';
import { t } from '@/services/i18n';
import { useTheme } from '@/services/theme';

type BadgeCelebrationSheetProps = {
  badge: Badge | null;
  progress: MilestoneProgress | null;
  /** 닫히는 애니메이션 동안에도 내용이 남아 있도록 visible을 밖에서 늦게 끈다. */
  visible: boolean;
  onDismiss: () => void;
  onOpenFootprint: () => void;
};

// 채택안(celebration-03): 마일스톤 화면 위에 올라오는 바텀시트. 이동 없이 즉시 확인하는 축하다.
export function BadgeCelebrationSheet({
  badge,
  progress,
  visible,
  onDismiss,
  onOpenFootprint,
}: BadgeCelebrationSheetProps) {
  const { palette } = useTheme();
  if (!badge) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      presentationStyle="overFullScreen"
      onRequestClose={onDismiss}>
      <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(20, 30, 26, 0.52)' }}>
        <Pressable
          accessibilityLabel={t('footprint.celebration.later')}
          onPress={onDismiss}
          style={{ position: 'absolute', inset: 0 }}
        />
        <View
          style={{
            backgroundColor: palette.surface,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingHorizontal: 24,
            paddingTop: 12,
            paddingBottom: 40,
          }}>
          <View className="h-[5px] w-[42px] self-center rounded-full bg-[#DCE3DE]" />

          <View className="mt-[22px] items-center">
            <View
              style={{
                width: 76,
                height: 76,
                borderRadius: 26,
                backgroundColor: '#E7ECEA',
                borderWidth: 2,
                borderColor: palette.accent,
                alignItems: 'center',
                justifyContent: 'center',
                transform: [{ rotate: '-6deg' }],
              }}>
              <Text className="text-[36px]">{badge.icon}</Text>
            </View>
          </View>

          <Text
            className="mt-[18px] text-center text-[10px] font-extrabold tracking-[2.4px]"
            style={{ color: palette.accent }}>
            NEW BADGE
          </Text>
          <Text className="mt-2 text-center text-[25px] tracking-[-0.5px] text-[#26332D]">
            {badge.title}
          </Text>
          <Text className="mt-2.5 text-center text-[13.5px] leading-[21px] text-[#778078]">
            {badge.description}
            {t('footprint.celebration.addedNote')}
          </Text>

          {progress ? (
            <View
              className="mt-[22px] rounded-[18px] border"
              style={{
                backgroundColor: '#F4F7F3',
                borderColor: '#E4EAE4',
                paddingHorizontal: 18,
                paddingVertical: 16,
              }}>
              <Text className="text-[11px] font-bold tracking-[0.6px]" style={{ color: '#879087' }}>
                {t('footprint.celebration.reasonLabel')}
              </Text>
              <Text className="mt-1.5 text-[15px] font-extrabold" style={{ color: '#2D423B' }}>
                {achievementReason(badge, progress)}
              </Text>
              <View
                className="mt-3 h-2 overflow-hidden rounded-full"
                style={{ backgroundColor: '#E1E7E2' }}>
                <View
                  className="h-full w-full rounded-full"
                  style={{ backgroundColor: palette.accent }}
                />
              </View>
              <View className="mt-2 flex-row justify-between">
                <Text className="text-[11px]" style={{ color: '#98A199' }}>
                  {t('footprint.celebration.completed', {
                    value: formatMetric(badge.metric, badge.threshold),
                  })}
                </Text>
                <Text className="text-[11px]" style={{ color: '#98A199' }}>
                  {t('footprint.celebration.earned', {
                    date: formatBadgeDate(badge.achieved_at),
                  })}
                </Text>
              </View>
            </View>
          ) : null}

          <Pressable
            accessibilityRole="button"
            onPress={onOpenFootprint}
            className="mt-[22px] items-center rounded-full py-[17px]"
            style={{ backgroundColor: palette.accent }}>
            <Text className="text-[15.5px] font-bold text-white">
              {t('footprint.celebration.viewFootprint')}
            </Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onDismiss} className="items-center py-3.5">
            <Text className="text-[13.5px]" style={{ color: '#98A199' }}>
              {t('footprint.celebration.later')}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
