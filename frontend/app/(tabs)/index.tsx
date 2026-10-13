import { useCallback, useEffect, useState, type ComponentProps } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  completeTask,
  createApplication,
  createIdempotencyKey,
  getApplications,
  getDashboard,
  recordStageEvent,
  revertCompletion,
  searchCompanies,
  undoDefer,
  type Dashboard,
} from '@/services/api';
import { getDeviceToken } from '@/services/device-token';
import { formatDate, t } from '@/services/i18n';
import { useTheme } from '@/services/theme';
import { RewardPaceCard } from '@/components/home/RewardPaceCard';
import { ApplicationsCard } from '@/components/home/ApplicationsCard';
import { AlgorithmCompleteSheet } from '@/components/home/AlgorithmCompleteSheet';
import { ApplicationCompleteSheet } from '@/components/home/ApplicationCompleteSheet';
import { isStalePausedFocus } from '@/services/focus-session';
import { NextActionCard } from '@/components/home/NextActionCard';
import { getTodayRecommendations } from '@/services/today-recommendation';

type DashboardTask = NonNullable<Dashboard['tasks']>[number];
type BoardStatus = 'todo' | 'doing' | 'done';

// Mindvalley Progress 스크린에서 가져온 토큰: 먹빛 텍스트 + 흰 바탕 + 헤어라인 카드.
const INK = '#111418';
const META = '#8A9099';
const TRACK = '#EEF0F2';
const RING = '#DDE1E6';

const boardColumns: { id: BoardStatus; labelKey: string; captionKey: string }[] = [
  { id: 'todo', labelKey: 'home.board.todo.label', captionKey: 'home.board.todo.caption' },
  { id: 'doing', labelKey: 'home.board.doing.label', captionKey: 'home.board.doing.caption' },
  { id: 'done', labelKey: 'home.board.done.label', captionKey: 'home.board.done.caption' },
];

function getTaskStatus(task: DashboardTask): BoardStatus {
  if (task.goal_completed) return 'done';
  if (task.completed_count > 0) return 'doing';
  return 'todo';
}

function formatCompactPoints(points: number) {
  if (points < 1_000) return points.toLocaleString();

  const compact = (points / 1_000).toFixed(points >= 10_000 ? 0 : 1).replace(/\.0$/, '');
  return `${compact}K`;
}

function StatTile({
  icon,
  color,
  value,
  label,
}: {
  icon: ComponentProps<typeof Ionicons>['name'];
  color: string;
  value: string;
  label: string;
}) {
  return (
    <View className="flex-1 items-center justify-center rounded-3xl border border-hairline bg-white px-3 py-6">
      <Ionicons name={icon} size={26} color={color} />
      <Text className="mt-3 text-[30px] font-bold leading-9 text-ink">{value}</Text>
      <Text className="mt-1 text-center text-[11px] font-bold leading-4 tracking-[1.2px] text-meta">
        {label}
      </Text>
    </View>
  );
}

export default function Home() {
  const [token, setToken] = useState<string | null | undefined>();
  const [activePage, setActivePage] = useState(0);
  const [recommendationIndex, setRecommendationIndex] = useState(0);
  // 실제 지원 완료 전 회사명 입력 시트 상태.
  const [applicationPrompt, setApplicationPrompt] = useState<DashboardTask | null>(null);
  const queryClient = useQueryClient();
  const { palette } = useTheme();

  useEffect(() => {
    getDeviceToken().then(setToken);
  }, []);

  const dashboard = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => getDashboard(token!),
    enabled: Boolean(token),
  });
  useFocusEffect(
    useCallback(() => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    }, [queryClient])
  );
  const taskMutation = useMutation({
    mutationFn: async ({
      task,
      note,
      companyId,
    }: {
      task: DashboardTask;
      note?: string;
      companyId?: string;
    }) => {
      if (task.read_only) return;
      if (!token) throw new Error(t('common.connectFirst'));
      const completion = task.completions.at(-1);
      const shouldRevert = task.goal_completed;
      return shouldRevert && completion
        ? Promise.all(
            task.completions.map((item) => revertCompletion(item.id, token, createIdempotencyKey()))
          )
        : completeTask(task.id, token, createIdempotencyKey(), note, companyId);
    },
    // 오프라인 큐 적재 시에도 보드의 +1이 즉시 보이도록 캐시를 미리 갱신한다.
    onMutate: async ({ task }) => {
      await queryClient.cancelQueries({ queryKey: ['dashboard'] });
      const previous = queryClient.getQueryData<Dashboard>(['dashboard']);
      queryClient.setQueryData<Dashboard>(['dashboard'], (current) =>
        current
          ? {
              ...current,
              tasks: current.tasks.map((item) => {
                if (item.id !== task.id) return item;
                if (task.goal_completed) {
                  return {
                    ...item,
                    completed_count: 0,
                    remaining_count: item.target_count,
                    goal_completed: false,
                    completions: [],
                  };
                }
                const completed = Math.min(item.completed_count + 1, item.target_count);
                return {
                  ...item,
                  completed_count: completed,
                  remaining_count: Math.max(item.target_count - completed, 0),
                  goal_completed: completed >= item.target_count,
                  completions: [
                    ...item.completions,
                    { id: `optimistic-${Date.now()}`, note: null, note_verified: null },
                  ],
                };
              }),
            }
          : current
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(['dashboard'], context.previous);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['badges'] });
    },
  });
  // 서버의 Company.normalize_name과 같은 키로 회사명을 비교한다(괄호·법인형태 제거, 소문자).
  const normalizeCompany = (name: string) =>
    name
      .toLowerCase()
      .replace(/[（(][^）)]*[）)]/g, ' ')
      .replace(/주식회사|유한회사|유한책임회사|사단법인|재단법인/g, ' ')
      .replace(/\b(inc|corp|corporation|ltd|llc|co|company|limited)\b/g, ' ')
      .replace(/[^0-9a-z가-힣]/g, '');
  // "실제 지원" 회사 확인 → 해당 건의 제출 단계를 기록한다. 지원 포인트의 유일한 경로이며
  // 제출 단계 기록이 그날의 할 일 완료까지 자동으로 채운다(포인트는 중복 지급되지 않는다).
  const stageMutation = useMutation({
    mutationFn: async ({ note, companyId }: { note: string; companyId: string | null }) => {
      if (!token) throw new Error(t('common.connectFirst'));
      const { applications, stages } = await getApplications(token);
      const submission = stages.find((stage) => stage.kind === 'submission' && stage.active);
      if (!submission) throw new Error(t('applications.error.noSubmissionStage'));
      const key = normalizeCompany(note);
      let application = applications.find(
        (item) => item.status === 'active' && normalizeCompany(item.company) === key
      );
      if (!application) {
        try {
          const created = await createApplication(token, {
            company: note,
            companyId: companyId ?? undefined,
          });
          application = created.data.application;
        } catch (error) {
          // 같은 회사의 진행 중인 건이 이미 있는 경우(서버 검증) → 그 건에 이어 기록한다.
          const fresh = await getApplications(token);
          application = fresh.applications.find(
            (item) => item.status === 'active' && normalizeCompany(item.company) === key
          );
          if (!application) throw error;
        }
      }
      return recordStageEvent(token, application.id, submission.id, createIdempotencyKey());
    },
    // 오프라인 큐 적재 시에도 보드의 +1이 즉시 보이도록 캐시를 미리 갱신한다.
    onMutate: async () => {
      if (!applicationPrompt) return;
      await queryClient.cancelQueries({ queryKey: ['dashboard'] });
      const previous = queryClient.getQueryData<Dashboard>(['dashboard']);
      queryClient.setQueryData<Dashboard>(['dashboard'], (current) =>
        current
          ? {
              ...current,
              tasks: current.tasks.map((item) => {
                if (item.id !== applicationPrompt.id) return item;
                const completed = Math.min(item.completed_count + 1, item.target_count);
                return {
                  ...item,
                  completed_count: completed,
                  remaining_count: Math.max(item.target_count - completed, 0),
                  goal_completed: completed >= item.target_count,
                  completions: [
                    ...item.completions,
                    { id: `optimistic-${Date.now()}`, note: null, note_verified: null, stage_backed: true },
                  ],
                };
              }),
            }
          : current
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(['dashboard'], context.previous);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      queryClient.invalidateQueries({ queryKey: ['badges'] });
      queryClient.invalidateQueries({ queryKey: ['history'] });
    },
  });
  // 회복 패스로 내일 보낸 할 일을 오늘 안에 되돌린다.
  const undoMutation = useMutation({
    mutationFn: (deferralId: string) => {
      if (!token) throw new Error(t('common.connectFirst'));
      return undoDefer(token, deferralId);
    },
    onMutate: async (deferralId: string) => {
      await queryClient.cancelQueries({ queryKey: ['dashboard'] });
      const previous = queryClient.getQueryData<Dashboard>(['dashboard']);
      // 이월 목록에서 바로 없애 화면에 즉시 반영한다(할 일 자체의 복귀는 재전송 후 갱신).
      queryClient.setQueryData<Dashboard>(['dashboard'], (current) =>
        current
          ? {
              ...current,
              deferrals: current.deferrals.filter((item) => item.deferral_id !== deferralId),
            }
          : current
      );
      return { previous };
    },
    onError: (_error, _deferralId, context) => {
      if (context?.previous) queryClient.setQueryData(['dashboard'], context.previous);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['history'] });
      queryClient.invalidateQueries({ queryKey: ['redemptions'] });
      queryClient.invalidateQueries({ queryKey: ['reward-unlocks'] });
    },
  });
  // 알고리즘 완료만 확인창을 거친다(문제명+답변 확인 후 +1). 실제 지원은 회사명이 있어야 +1.
  const [confirmTask, setConfirmTask] = useState<DashboardTask | null>(null);
  const requestComplete = (task: DashboardTask) => {
    if (!task.goal_completed && task.kind === 'algorithm') {
      setConfirmTask(task);
      return;
    }
    if (!task.goal_completed && task.kind === 'application') {
      stageMutation.reset();
      setApplicationPrompt(task);
      return;
    }
    // 지원 기록으로 채워진 완료는 지원 현황에서 단계를 취소할 때만 되돌아간다.
    if (task.goal_completed && task.completions.some((item) => item.stage_backed)) {
      router.push('/applications');
      return;
    }
    taskMutation.mutate({ task });
  };
  const confirmAlgorithm = () => {
    if (!confirmTask) return;
    taskMutation.mutate({ task: confirmTask }, { onSuccess: () => setConfirmTask(null) });
  };
  // 회사 자동완성: 캐시된 실존 목록에서 검색해 시트에 넘긴다.
  const searchCompanyList = useCallback(
    async (query: string) => {
      if (!token) return [];
      const companies = await searchCompanies(token, query);
      return companies.data;
    },
    [token]
  );
  // 지원한 회사명이 확인돼야 완료로 넘어간다(빈 값은 시트에서 막고, 회사 선택 여부는 서버가 재검증한다).
  const confirmApplication = (note: string, companyId: string | null) => {
    if (!applicationPrompt) return;
    stageMutation.mutate(
      { note, companyId },
      { onSuccess: () => setApplicationPrompt(null) }
    );
  };

  const tasks = dashboard.data?.tasks ?? [];
  const deferrals = dashboard.data?.deferrals ?? [];
  const points = dashboard.data?.daily_summary.points_total ?? 0;
  const totalPoints = dashboard.data?.total_points ?? 0;
  const totalGoal = tasks.length;
  const doneCount = tasks.filter((task) => task.goal_completed).length;
  const remainingGoals = Math.max(totalGoal - doneCount, 0);
  const completionRate = totalGoal ? Math.round((doneCount / totalGoal) * 100) : 0;
  const remaining = Math.max(100 - points, 0);
  const stalePausedFocus = isStalePausedFocus(dashboard.data?.focus_session);
  const recommendations = getTodayRecommendations(tasks, points);
  const recommendation = recommendations[recommendationIndex % recommendations.length];
  const board = boardColumns.map((column) => ({
    ...column,
    label: t(column.labelKey),
    caption: t(column.captionKey),
    tasks: tasks.filter((task) => getTaskStatus(task) === column.id),
  }));
  const activeColumn = board[activePage] ?? board[0];

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'left', 'right']}>
      <ScrollView className="flex-1" contentContainerClassName="pb-8">
        {/* 상단 바: 가운데 제목 + 날짜 */}
        <View className="items-center px-5 pt-5">
          <Text className="text-[17px] font-bold text-ink">{t('home.title')}</Text>
          <Text className="mt-0.5 text-xs text-meta">{formatDate(new Date())}</Text>
        </View>

        {dashboard.isError ? (
          <View className="mx-5 mt-6 rounded-3xl border border-hairline bg-white px-5 py-4">
            <Text className="text-[13px] leading-5 text-[#C44B5D]">{dashboard.error.message}</Text>
          </View>
        ) : null}

        {stalePausedFocus ? (
          <Pressable
            onPress={() => router.push('/focus')}
            accessibilityRole="button"
            accessibilityLabel={t('home.staleFocusAction')}
            className="mx-5 mt-6 rounded-3xl border border-hairline bg-white px-5 py-4 transition duration-150 hover:opacity-90">
            <Text className="text-[15px] font-bold text-ink">{t('home.staleFocusTitle')}</Text>
            <Text className="mt-1 text-[13px] leading-5 text-meta">
              {t('home.staleFocusDescription')}
            </Text>
            <Text className="mt-3 text-[13px] font-bold" style={{ color: palette.accent }}>
              {t('home.staleFocusAction')}
            </Text>
          </Pressable>
        ) : null}

        {/* 오늘의 목표: 완료 상태를 담은 배지 */}
        <View className="mx-5 mt-6 rounded-3xl border border-hairline bg-white px-5 py-5">
          <View className="flex-row items-center">
            <View
              className="h-[46px] w-[46px] items-center justify-center rounded-full border-2"
              style={{
                borderColor: doneCount > 0 ? palette.accent : RING,
                backgroundColor: doneCount > 0 ? palette.accent : '#FFFFFF',
              }}>
              {totalGoal > 0 && doneCount === totalGoal ? (
                <Ionicons name="checkmark" size={22} color="#FFFFFF" />
              ) : (
                <Text
                  className="text-[16px] font-bold"
                  style={{ color: doneCount > 0 ? '#FFFFFF' : META }}>
                  {doneCount}
                </Text>
              )}
            </View>
            <View className="ml-3 flex-1">
              <Text className="text-[11px] font-bold tracking-[1.5px] text-meta">
                {t('home.goalsEyebrow')}
              </Text>
              <Text className="mt-1 text-[15px] font-semibold text-ink">
                {t('home.goalsTotal', { count: totalGoal })}
              </Text>
            </View>
            <Text className="text-[26px] font-bold leading-8 text-ink">{completionRate}%</Text>
          </View>

          {totalGoal === 0 ? (
            <Text className="mt-4 text-[13px] leading-5 text-meta">
              {t('home.configureGoalsHint')}
            </Text>
          ) : null}
        </View>

        {/* 지표 2 x 2 */}
        <View className="mx-5 mt-5 flex-row gap-4">
          <StatTile
            icon="checkmark-circle-outline"
            color="#12B76A"
            value={String(doneCount)}
            label={t('home.stats.completed')}
          />
          <StatTile
            icon="time-outline"
            color="#F79009"
            value={String(remainingGoals)}
            label={t('home.stats.remaining')}
          />
        </View>
        <View className="mx-5 mt-4 flex-row gap-4">
          <StatTile
            icon="star-outline"
            color="#2E90FA"
            value={String(points)}
            label={t('home.stats.todayPoints')}
          />
          <StatTile
            icon="trophy-outline"
            color={palette.accent}
            value={formatCompactPoints(totalPoints)}
            label={t('home.stats.totalPoints')}
          />
        </View>

        {/* 밑줄 세그먼트 컨트롤: 태스크 바로 위 */}
        <View className="mt-6 flex-row px-5">
          {board.map((column, index) => {
            const isActive = activePage === index;
            return (
              <Pressable
                key={column.id}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
                accessibilityLabel={t('home.viewTasks', { status: column.label })}
                onPress={() => setActivePage(index)}
                className="flex-1 items-center justify-end pb-3"
                style={{ borderBottomWidth: 3, borderBottomColor: isActive ? INK : 'transparent' }}>
                <View className="flex-row items-baseline">
                  <Text className="text-[15px] font-bold" style={{ color: isActive ? INK : META }}>
                    {column.label}
                  </Text>
                  <Text
                    className="ml-1.5 text-[13px] font-bold"
                    style={{ color: isActive ? INK : META }}>
                    {column.tasks.length}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* 상태별 스택 리스트 */}
        <View className="mx-5 mt-3 rounded-3xl border border-hairline bg-white">
          <View className="px-5 pt-4">
            <Text className="text-xs text-meta">{activeColumn.caption}</Text>
          </View>

          {dashboard.isLoading ? (
            <Text className="px-5 pb-6 pt-5 text-[13px] text-meta">{t('home.loading')}</Text>
          ) : activeColumn.tasks.length === 0 ? (
            <View className="px-5 pb-6 pt-4">
              {activeColumn.id === 'todo' && tasks.length === 0 ? (
                <Pressable
                  onPress={() => router.push('/tasks')}
                  accessibilityRole="button"
                  accessibilityLabel={t('home.configureGoals')}
                  accessibilityHint={t('home.configureGoalsHint')}
                  className="flex-row items-center justify-between rounded-2xl border border-hairline px-4 py-3.5 transition duration-150 hover:opacity-90">
                  <View className="flex-1 pr-3">
                    <Text className="text-[15px] font-bold text-ink">
                      {t('home.configureGoals')}
                    </Text>
                    <Text className="mt-0.5 text-xs text-meta">{t('home.configureGoalsHint')}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={INK} />
                </Pressable>
              ) : null}

              {activeColumn.id === 'todo' && recommendation ? (
                <NextActionCard
                  embedded
                  recommendation={recommendation}
                  hasAlternatives={recommendations.length > 1}
                  disabled={taskMutation.isPending}
                  onAct={() => {
                    if (recommendation.type === 'focus') {
                      router.push('/focus');
                      return;
                    }
                    requestComplete(recommendation.task);
                  }}
                  onNext={() => setRecommendationIndex((current) => current + 1)}
                />
              ) : (
                <View className="items-center px-4 pb-2 pt-6">
                  <View className="h-9 w-9 rounded-full border-2" style={{ borderColor: RING }} />
                  <Text className="mt-3 text-center text-[13px] leading-5 text-meta">
                    {activeColumn.id === 'done' ? t('home.emptyDone') : t('home.emptyColumn')}
                  </Text>
                </View>
              )}
            </View>
          ) : (
            activeColumn.tasks.map((task, index) => {
              const taskProgress = Math.min(
                100,
                Math.round((task.completed_count / task.target_count) * 100)
              );
              const statusLabel = task.goal_completed
                ? task.read_only
                  ? t('home.goalCompletedReadOnly', {
                      completed: task.completed_count,
                      total: task.target_count,
                    })
                  : t('home.goalCompletedProgress', {
                      completed: task.completed_count,
                      total: task.target_count,
                    })
                : t('home.taskProgress', {
                    completed: task.completed_count,
                    total: task.target_count,
                  });
              const lastCompletion = task.completions.at(-1);
              const recordedNote =
                task.kind === 'application' && lastCompletion?.note ? lastCompletion.note : null;
              const noteUnverified = lastCompletion?.note_verified === false;
              return (
                <View key={task.id}>
                  {index > 0 ? <View className="mx-5 h-px bg-hairline" /> : null}
                  <Pressable
                    disabled={taskMutation.isPending || task.read_only}
                    onPress={() => {
                      if (!task.goal_completed && task.kind === 'focus') {
                        router.push('/focus');
                        return;
                      }
                      requestComplete(task);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={t('home.taskAccessibility', {
                      title: task.title,
                      action: task.read_only
                        ? t('home.goalCompleted')
                        : task.goal_completed
                          ? t('home.revertAction')
                          : task.kind === 'focus'
                            ? t('focus.start')
                            : t('home.completeAction'),
                    })}
                    className="px-5 py-4 transition duration-150 hover:opacity-90 disabled:opacity-50">
                    <View className="flex-row items-center">
                      {task.goal_completed ? (
                        <View
                          className="h-7 w-7 items-center justify-center rounded-full"
                          style={{ backgroundColor: INK }}>
                          <Ionicons name="checkmark" size={15} color="#FFFFFF" />
                        </View>
                      ) : (
                        <View
                          className="h-7 w-7 rounded-full border-2"
                          style={{
                            borderColor: task.completed_count > 0 ? palette.accent : RING,
                          }}
                        />
                      )}

                      <View className="ml-3 flex-1 pr-2">
                        <Text
                          className="text-[15px] font-semibold leading-5 text-ink"
                          numberOfLines={2}>
                          {task.title}
                        </Text>
                        <Text className="mt-1 text-xs leading-4 text-meta">{statusLabel}</Text>
                        {recordedNote ? (
                          <Text
                            className={`mt-0.5 text-[11px] font-semibold leading-4 ${
                              noteUnverified ? 'text-[#C44B5D]' : 'text-meta'
                            }`}>
                            {noteUnverified
                              ? t('home.applicationNote.unverified', { note: recordedNote })
                              : t('home.applicationNote.recorded', { note: recordedNote })}
                          </Text>
                        ) : null}
                      </View>

                      {task.goal_completed ? null : (
                        <Text className="text-[13px] font-bold" style={{ color: palette.accent }}>
                          {`+${task.points}`}
                        </Text>
                      )}
                    </View>

                    {task.goal_completed ? null : (
                      <View
                        className="ml-10 mt-3 h-1 overflow-hidden rounded-full"
                        style={{ backgroundColor: TRACK }}>
                        <View
                          style={{
                            width: `${taskProgress}%`,
                            backgroundColor: palette.accent,
                          }}
                          className="h-full rounded-full"
                        />
                      </View>
                    )}
                  </Pressable>
                </View>
              );
            })
          )}
        </View>

        {/* 내일로 보낸 할 일 */}
        {deferrals.length ? (
          <View className="mx-5 mt-4 rounded-3xl border border-hairline bg-white px-5 py-4">
            <Text className="text-[15px] font-bold text-ink">{t('home.deferrals.title')}</Text>
            <Text className="mt-1 text-[13px] leading-5 text-meta">
              {t('home.deferrals.description')}
            </Text>
            {deferrals.map((item) => (
              <View key={item.deferral_id}>
                <View className="mt-3 h-px bg-hairline" />
                <View className="flex-row items-center justify-between pt-3">
                  <View className="flex-1 pr-3">
                    <Text
                      className="text-[15px] font-semibold leading-5 text-ink"
                      numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text className="mt-0.5 text-xs text-meta">
                      {t('home.deferrals.meetAgain', {
                        month: Number(item.to_date.slice(5, 7)),
                        day: Number(item.to_date.slice(8)),
                      })}
                    </Text>
                  </View>
                  <Pressable
                    disabled={undoMutation.isPending}
                    onPress={() => undoMutation.mutate(item.deferral_id)}
                    accessibilityRole="button"
                    accessibilityLabel={t('home.deferrals.undoAccessibility', {
                      title: item.title,
                    })}
                    className="min-h-9 items-center justify-center rounded-full border border-hairline px-3.5">
                    <Text className="text-xs font-bold" style={{ color: palette.accent }}>
                      {t('home.deferrals.undo')}
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))}
            {undoMutation.isError ? (
              <Text className="mt-2 text-[11px] text-[#C44B5D]">
                {(undoMutation.error as Error).message}
              </Text>
            ) : null}
          </View>
        ) : null}

        {dashboard.data?.applications ? (
          <ApplicationsCard
            activeCount={dashboard.data.applications.active_count}
            recent={dashboard.data.applications.recent}
          />
        ) : null}

        <RewardPaceCard points={points} remaining={remaining} />
      </ScrollView>

      {confirmTask ? (
        <AlgorithmCompleteSheet
          taskTitle={confirmTask.title}
          completedCount={confirmTask.completed_count}
          targetCount={confirmTask.target_count}
          saving={taskMutation.isPending}
          error={taskMutation.error?.message ?? null}
          onClose={() => setConfirmTask(null)}
          onConfirm={confirmAlgorithm}
        />
      ) : null}

      {applicationPrompt ? (
        <ApplicationCompleteSheet
          taskTitle={applicationPrompt.title}
          completedCount={applicationPrompt.completed_count}
          targetCount={applicationPrompt.target_count}
          saving={stageMutation.isPending}
          error={stageMutation.error?.message ?? null}
          onClose={() => setApplicationPrompt(null)}
          onSearch={searchCompanyList}
          onConfirm={confirmApplication}
        />
      ) : null}
    </SafeAreaView>
  );
}
