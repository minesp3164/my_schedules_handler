import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { getHistory, type HistoryDay } from '@/services/api';
import { getDeviceToken } from '@/services/device-token';
import { formatShortDate } from '@/services/i18n';
import { useTheme } from '@/services/theme';

const eventLabel: Record<HistoryDay['point_events'][number]['event_type'], string> = {
  task_completion: '할 일 완료',
  focus_completion: '집중 완료',
  daily_bonus: '하루 목표 보너스',
  reward_redemption: '보상 사용',
  adjustment: '포인트 조정',
};

function localIsoDate(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function displayDate(date: string) {
  return formatShortDate(new Date(`${date}T12:00:00`));
}

export default function PointHistoryScreen() {
  const [token, setToken] = useState<string | null>();
  const { palette } = useTheme();
  useEffect(() => {
    getDeviceToken().then(setToken);
  }, []);

  const range = useMemo(() => {
    const to = new Date();
    const from = new Date();
    from.setDate(to.getDate() - 29);
    return { from: localIsoDate(from), to: localIsoDate(to) };
  }, []);
  const history = useQuery({
    queryKey: ['point-history', range.from, range.to],
    queryFn: () => getHistory(token!, range.from, range.to),
    enabled: Boolean(token),
  });
  const days = (history.data ?? []).filter((day) => day.point_events.length > 0).reverse();

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: palette.screen }}>
      <ScrollView contentContainerClassName="px-5 pb-10 pt-4">
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="뒤로 가기"
          className="min-h-11 justify-center self-start py-2">
          <Text className="text-sm font-bold" style={{ color: palette.accent }}>
            ← 포인트 상점
          </Text>
        </Pressable>
        <Text className="mt-4 text-2xl font-bold tracking-tight text-[#24232A]">포인트 내역</Text>
        <Text className="mt-2 text-sm leading-5 text-[#6B6571]">
          최근 30일 동안 포인트가 쌓이거나 사용된 이유를 확인해요.
        </Text>

        <View className="mt-6 gap-5">
          {days.map((day) => (
            <View key={day.date}>
              <Text className="mb-2 text-xs font-bold" style={{ color: palette.accentDeep }}>
                {displayDate(day.date)}
              </Text>
              <View
                className="overflow-hidden rounded-2xl border bg-white"
                style={{ borderColor: palette.line }}>
                {[...day.point_events].reverse().map((event, index) => {
                  const reverted = Boolean(event.reversed_at);
                  const positive = event.points > 0;
                  return (
                    <View
                      key={event.id}
                      className={`flex-row items-center justify-between px-4 py-4 ${
                        index ? 'border-t' : ''
                      }`}
                      style={index ? { borderColor: palette.line } : undefined}>
                      <View className="flex-1 pr-3">
                        <Text
                          className={`text-sm font-bold ${reverted ? 'text-[#98929E]' : 'text-[#37323F]'}`}>
                          {eventLabel[event.event_type]}
                        </Text>
                        <Text className="mt-1 text-[11px] text-[#817A87]">
                          {reverted
                            ? '취소된 기록 · 잔액에 반영되지 않아요'
                            : '보유 포인트에 반영됨'}
                        </Text>
                      </View>
                      <Text
                        className={`text-base font-bold ${reverted ? 'text-[#98929E]' : ''}`}
                        style={
                          !reverted ? { color: positive ? palette.accent : '#E85E4A' } : undefined
                        }>
                        {positive ? '+' : ''}
                        {event.points.toLocaleString()}점
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          ))}
          {!history.isLoading && days.length === 0 ? (
            <View
              className="items-center rounded-2xl border border-dashed px-5 py-12"
              style={{ borderColor: palette.line }}>
              <Text className="text-base font-bold text-[#37323F]">아직 포인트 기록이 없어요</Text>
              <Text className="mt-2 text-center text-xs leading-5 text-[#817A87]">
                할 일을 완료하거나 집중을 마치면 이곳에 이유와 함께 표시돼요.
              </Text>
            </View>
          ) : null}
          {history.isError ? (
            <Text className="text-sm text-[#E85E4A]">포인트 내역을 불러오지 못했어요.</Text>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
