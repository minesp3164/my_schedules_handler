import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import type { HistoryDay, RewardUnlockState } from '@/services/api';
import { useTheme } from '@/services/theme';

const iso = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

type Props = {
  day: HistoryDay;
  isToday: boolean;
  recovery?: RewardUnlockState | null;
};

// 날짜별 리캡: 오늘의 진척과 "내일로 보낸 할 일", 회복 모드 입구.
export function DayRecap({ day, isToday, recovery }: Props) {
  const { palette } = useTheme();
  const recap = day.recap;
  const focusMinutes = Math.round(day.summary.focus_seconds / 60);
  const hasRemaining = recap.tasks_done < recap.tasks_total;
  const canRecovery =
    isToday && hasRemaining && Boolean(recovery && (recovery.available || recovery.record));

  return (
    <View
      className="mt-4 overflow-hidden rounded-3xl border p-5"
      style={{ borderColor: palette.line, backgroundColor: palette.surface }}>
      <View className="flex-row items-center justify-between">
        <Text className="text-[10px] font-bold tracking-[1.5px]" style={{ color: palette.accent }}>
          DAY RECAP
        </Text>
        <Text className="text-[11px] text-muted">{day.date}</Text>
      </View>

      <View className="mt-3 flex-row flex-wrap gap-2">
        <Stat label="포인트" value={`${day.summary.points_total}점`} />
        <Stat label="집중" value={`${focusMinutes}분`} />
        <Stat
          label="목표"
          value={`${recap.tasks_done}/${recap.tasks_total}`}
          highlight={recap.goal_achieved}
        />
      </View>

      {recap.goal_achieved ? (
        <Text className="mt-3 text-xs font-bold" style={{ color: palette.accent }}>
          ✦ 오늘의 목표를 채웠어요
        </Text>
      ) : isToday && hasRemaining ? (
        <Text className="mt-3 text-xs text-muted">
          아직 {recap.tasks_total - recap.tasks_done}개가 남았어요.
        </Text>
      ) : null}

      {recap.deferred.length ? (
        <View className="mt-3 rounded-2xl bg-[#E9F9BC] px-4 py-3">
          <Text className="text-[10px] font-bold text-[#667247]">내일로 보낸 할 일</Text>
          {recap.deferred.map((item) => (
            <Text key={item.deferral_id} className="mt-1 text-sm text-[#37451C]">
              · {item.title} → {item.to_date.slice(5).replace('-', '월 ')}일
            </Text>
          ))}
        </View>
      ) : null}

      {canRecovery ? (
        <Pressable
          onPress={() => router.push({ pathname: '/rewards/[kind]', params: { kind: 'recovery' } })}
          accessibilityRole="button"
          accessibilityLabel="회복 패스로 할 일 내려놓기"
          className="mt-4 flex-row items-center justify-between rounded-2xl px-4 py-3.5"
          style={{ backgroundColor: recovery?.record ? '#9AC13C' : palette.accent }}>
          <Text className="text-sm font-bold text-white">회복 패스로 오늘 내려놓기</Text>
          <Text className="text-base text-white">→</Text>
        </Pressable>
      ) : null}
      {isToday && hasRemaining && recovery && !recovery.unlocked ? (
        <Text className="mt-3 text-[11px] text-muted">
          누적 200점이 되면 회복 패스로 남은 할 일을 내일로 보낼 수 있어요.
        </Text>
      ) : null}
      {isToday && hasRemaining && recovery && recovery.unlocked && !canRecovery ? (
        <Text className="mt-3 text-[11px] text-muted">
          {recovery.reason === 'limit'
            ? '이번 누적 구간의 패스는 사용했어요. 다음 패스는 누적 400점에서 열려요.'
            : '회복 패스를 나중에 하기로 해뒀어요. 보관함에서 다시 가져오면 사용할 수 있어요.'}
        </Text>
      ) : null}
    </View>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  const { palette } = useTheme();
  return (
    <View
      className="rounded-xl px-3 py-2"
      style={{ backgroundColor: highlight ? palette.accent : palette.accentSoft }}>
      <Text className="text-[10px]" style={{ color: highlight ? '#FFFFFF' : palette.accent }}>
        {label}
      </Text>
      <Text
        className="mt-0.5 text-sm font-bold"
        style={{ color: highlight ? '#FFFFFF' : palette.accentDeep }}>
        {value}
      </Text>
    </View>
  );
}
