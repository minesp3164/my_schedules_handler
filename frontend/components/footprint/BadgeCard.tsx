import { Text, View } from 'react-native';
import type { Badge, MilestoneProgress } from '@/services/api';
import {
  categoryLabels,
  formatBadgeDate,
  isAchievedToday,
  medalColor,
  needText,
} from '@/services/badges';
import { useTheme } from '@/services/theme';

// 미달성 배지는 회색 점선 카드로, 달성 배지는 금색 메달 카드로 보여준다.
export function BadgeCard({
  badge,
  progress,
}: {
  badge: Badge;
  progress: MilestoneProgress | null;
}) {
  const achieved = Boolean(badge.achieved_at);
  const { palette } = useTheme();
  const need = achieved || !progress ? null : needText(badge, progress);

  return (
    <View style={{ width: '47.5%' }}>
      <View
        className="relative rounded-[20px] border"
        style={{
          backgroundColor: achieved ? palette.surface : '#F2F4F0',
          borderColor: '#E4EAE3',
          borderStyle: achieved ? 'solid' : 'dashed',
          paddingHorizontal: 14,
          paddingTop: 15,
          paddingBottom: 15,
        }}>
        {achieved && isAchievedToday(badge) ? (
          <View
            className="absolute -top-[9px] right-3 rounded-full border-2 border-white px-2 py-1"
            style={{ backgroundColor: '#FF6B4A' }}>
            <Text className="text-[9.5px] font-black tracking-[1px] text-white">NEW</Text>
          </View>
        ) : null}
        <Text
          className="absolute right-3.5 top-3.5 text-[9.5px] font-extrabold tracking-[0.5px]"
          style={{ color: '#B4BCB3' }}>
          {categoryLabels[badge.category]}
        </Text>

        <View
          style={
            achieved
              ? {
                  width: 54,
                  height: 54,
                  borderRadius: 99,
                  backgroundColor: medalColor(badge.category),
                  borderWidth: 2.5,
                  borderColor: '#26332D',
                  alignItems: 'center',
                  justifyContent: 'center',
                  shadowColor: '#26332D',
                  shadowOffset: { width: 3, height: 3 },
                  shadowOpacity: 0.85,
                  shadowRadius: 0,
                  elevation: 3,
                }
              : {
                  width: 54,
                  height: 54,
                  borderRadius: 99,
                  backgroundColor: '#E4EAE3',
                  borderWidth: 1.5,
                  borderColor: '#C4CCC3',
                  borderStyle: 'dashed',
                  alignItems: 'center',
                  justifyContent: 'center',
                }
          }>
          <Text className="text-[24px]">{badge.icon}</Text>
        </View>

        <Text
          className="mt-[11px] text-[14.5px] font-extrabold"
          style={{ color: achieved ? '#303B34' : '#A2ABA2' }}>
          {badge.title}
        </Text>
        <Text className="mt-[5px] text-[11px] leading-4 text-[#98A199]">{badge.description}</Text>

        {achieved ? (
          <Text
            className="mt-[9px] self-start rounded-lg px-2 py-1 text-[10.5px] font-bold"
            style={{ backgroundColor: palette.accentSoft, color: palette.accent }}>
            {formatBadgeDate(badge.achieved_at)}
          </Text>
        ) : need ? (
          <Text
            className="mt-[9px] self-start rounded-lg px-2 py-1 text-[10.5px] font-bold"
            style={{ backgroundColor: '#E9EDE7', color: '#98A199' }}>
            {need}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
