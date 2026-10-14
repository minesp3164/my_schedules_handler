import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getDashboard, getHistory, getWeeklyRetro, saveWeeklyRetro } from '@/services/api';
import { getDeviceToken } from '@/services/device-token';
import { useTheme } from '@/services/theme';
import { aggregate, DAY_MS, iso, mondayOf } from '@/services/week-stats';
import { RetroHeader } from '@/components/retro/RetroHeader';
import { RetroSummary } from '@/components/retro/RetroSummary';
import { RetroFooter } from '@/components/retro/RetroFooter';

export default function WeeklyRetroScreen() {
  const [token, setToken] = useState<string | null>();
  const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
  const [savedTick, setSavedTick] = useState(false);
  const { palette } = useTheme();
  const queryClient = useQueryClient();

  useEffect(() => {
    getDeviceToken().then(setToken);
  }, []);

  const thisMonday = useMemo(() => mondayOf(new Date()), []);
  const weekEnd = useMemo(() => new Date(weekStart.getTime() + 6 * DAY_MS), [weekStart]);
  const prevStart = useMemo(() => new Date(weekStart.getTime() - 7 * DAY_MS), [weekStart]);
  const prevEnd = useMemo(() => new Date(weekStart.getTime() - 1 * DAY_MS), [weekStart]);
  const isCurrentWeek = weekStart.getTime() >= thisMonday.getTime();
  const weekKey = iso(weekStart);

  const week = useQuery({
    queryKey: ['retro-week', weekKey],
    queryFn: () => getHistory(token!, weekKey, iso(weekEnd)),
    enabled: Boolean(token),
  });
  const previous = useQuery({
    queryKey: ['retro-week', iso(prevStart)],
    queryFn: () => getHistory(token!, iso(prevStart), iso(prevEnd)),
    enabled: Boolean(token),
  });
  const retro = useQuery({
    queryKey: ['weekly-retro', weekKey],
    queryFn: () => getWeeklyRetro(token!, weekKey),
    enabled: Boolean(token),
  });
  const dashboard = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => getDashboard(token!),
    enabled: Boolean(token),
  });

  const stats = useMemo(() => aggregate(week.data), [week.data]);
  const prevStats = useMemo(() => aggregate(previous.data), [previous.data]);
  const weeklyGoal = dashboard.data?.rewards.weekly.required_points;

  // 원본은 서버 본문(주 키 포함)이다. 사용자가 고친 값은 원본 키와 비교해 파생값으로 보여준다.
  // 원본이 바뀌면(주 변경·저장 후 재조회) 이펙트 없이 자연히 새 본문을 따라간다.
  const sourceBody = retro.data?.body ?? '';
  const sourceKey = `${weekKey}|${sourceBody}`;
  const [draftEdit, setDraftEdit] = useState<{ source: string; value: string } | null>(null);
  const draft = draftEdit && draftEdit.source === sourceKey ? draftEdit.value : sourceBody;
  const setDraft = (value: string) => setDraftEdit({ source: sourceKey, value });

  const save = useMutation({
    mutationFn: () => saveWeeklyRetro(token!, weekKey, draft.trim()),
    onSuccess: (result) => {
      queryClient.setQueryData(['weekly-retro', weekKey], result.data);
      // 생성 시 포인트가 차감되고 원장에 보상 사용 이벤트가 남으므로 관련 캐시를 무효화한다.
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['retro-week'] });
      queryClient.invalidateQueries({ queryKey: ['history'] });
      queryClient.invalidateQueries({ queryKey: ['history-calendar'] });
      queryClient.invalidateQueries({ queryKey: ['point-history'] });
      setSavedTick(true);
      setTimeout(() => setSavedTick(false), 2_000);
    },
  });

  const moveWeek = (weeks: number) => {
    setWeekStart((current) => new Date(current.getTime() + weeks * 7 * DAY_MS));
    setSavedTick(false);
  };
  const saveError = save.isError ? save.error.message : null;

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: palette.screen }}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <RetroHeader
          isCurrentWeek={isCurrentWeek}
          weekStart={weekStart}
          onPrevWeek={() => moveWeek(-1)}
          onNextWeek={() => moveWeek(1)}
        />

        <ScrollView className="flex-1" contentContainerClassName="px-5 pb-6 pt-4">
          <RetroSummary
            stats={stats}
            prevStats={prevStats}
            weeklyGoal={weeklyGoal}
            isCurrentWeek={isCurrentWeek}
            weekStart={weekStart}
          />

          {week.isError ? (
            <Text className="mt-4 text-center text-sm text-[#FF9BA6]">{week.error.message}</Text>
          ) : null}
        </ScrollView>

        <RetroFooter
          isCurrentWeek={isCurrentWeek}
          draft={draft}
          onDraftChange={setDraft}
          saved={savedTick}
          saving={save.isPending}
          canSave={Boolean(token)}
          hasSavedBody={Boolean(retro.data?.body)}
          error={saveError}
          onSave={() => save.mutate()}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
