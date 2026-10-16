import { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getDashboard } from '@/services/api';
import { getDeviceToken } from '@/services/device-token';
import { formatDate, t } from '@/services/i18n';
import { useTheme } from '@/services/theme';
import { isStalePausedFocus } from '@/services/focus-session';
import { getTodayRecommendations } from '@/services/today-recommendation';
import { ErrorRetry } from '@/components/LoadState';
import { RewardPaceCard } from '@/components/home/RewardPaceCard';
import { ApplicationsCard } from '@/components/home/ApplicationsCard';
import { AlgorithmCompleteSheet } from '@/components/home/AlgorithmCompleteSheet';
import { ApplicationCompleteSheet } from '@/components/home/ApplicationCompleteSheet';
import { PortfolioCompleteSheet } from '@/components/home/PortfolioCompleteSheet';
import { ResearchCompleteSheet } from '@/components/home/ResearchCompleteSheet';
import { HomeGoalsCard } from '@/components/home/HomeGoalsCard';
import { HomeStatsGrid } from '@/components/home/HomeStatsGrid';
import { BoardSegmentControl } from '@/components/home/BoardSegmentControl';
import { BoardTaskList } from '@/components/home/BoardTaskList';
import { DeferralsCard } from '@/components/home/DeferralsCard';
import { buildBoard, researchNotes, type DashboardTask } from '@/components/home/board';
import { useTaskCompletion } from '@/components/home/useTaskCompletion';
import { useApplicationStage } from '@/components/home/useApplicationStage';
import { useDeferralUndo } from '@/components/home/useDeferralUndo';

export default function Home() {
  const [token, setToken] = useState<string | null | undefined>();
  const [activePage, setActivePage] = useState(0);
  const [recommendationIndex, setRecommendationIndex] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
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

  // 당겨서 새로고침: 홈에 오면 최소 한 번은 서버 기준으로 다시 맞춘다.
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    } finally {
      setRefreshing(false);
    }
  }, [queryClient]);

  const {
    taskMutation,
    confirmTask,
    setConfirmTask,
    confirmAlgorithm,
    researchPrompt,
    setResearchPrompt,
    confirmResearch,
    skipResearchNote,
    portfolioPrompt,
    setPortfolioPrompt,
    confirmPortfolio,
  } = useTaskCompletion(token);
  const {
    stageMutation,
    applicationPrompt,
    setApplicationPrompt,
    searchCompanyList,
    confirmApplication,
  } = useApplicationStage(token);
  const { undoMutation } = useDeferralUndo(token);

  // 확인창을 거치는 종류: 알고리즘은 문제명+답변, 기업 리서치는 조사한 기업, 실제 지원은 회사명, 기술 블로그/회고는 글 주소.
  const requestComplete = (task: DashboardTask) => {
    if (!task.goal_completed && task.kind === 'algorithm') {
      setConfirmTask(task);
      return;
    }
    if (!task.goal_completed && task.kind === 'research') {
      // 지난 확인창 오류가 그대로 보이지 않도록 상태를 비우고 새로 연다.
      taskMutation.reset();
      setResearchPrompt(task);
      return;
    }
    if (!task.goal_completed && task.kind === 'application') {
      stageMutation.reset();
      setApplicationPrompt(task);
      return;
    }
    if (!task.goal_completed && task.kind === 'portfolio') {
      // 지난 확인창 오류가 그대로 보이지 않도록 상태를 비우고 새로 연다.
      taskMutation.reset();
      setPortfolioPrompt(task);
      return;
    }
    // 지원 기록으로 채워진 완료는 지원 현황에서 단계를 취소할 때만 되돌아간다.
    if (task.goal_completed && task.completions.some((item) => item.stage_backed)) {
      router.push('/applications');
      return;
    }
    taskMutation.mutate({ task });
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
  const board = buildBoard(tasks);
  const activeColumn = board[activePage] ?? board[0];

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top', 'left', 'right']}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-8"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#6F7D75"
            colors={['#52786B']}
          />
        }>
        {/* 상단 바: 가운데 제목 + 날짜 */}
        <View className="items-center px-5 pt-5">
          <Text className="text-[17px] font-bold text-ink">{t('home.title')}</Text>
          <Text className="mt-0.5 text-xs text-meta">{formatDate(new Date())}</Text>
        </View>

        {dashboard.isError ? (
          <ErrorRetry
            style={{ marginHorizontal: 20, marginTop: 24 }}
            message={dashboard.error.message}
            onRetry={() => void dashboard.refetch()}
          />
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

        <HomeGoalsCard
          doneCount={doneCount}
          totalGoal={totalGoal}
          completionRate={completionRate}
        />

        <HomeStatsGrid
          doneCount={doneCount}
          remainingGoals={remainingGoals}
          points={points}
          totalPoints={totalPoints}
        />

        <BoardSegmentControl columns={board} activePage={activePage} onChange={setActivePage} />

        <BoardTaskList
          loading={dashboard.isPending && !dashboard.isError}
          column={activeColumn}
          allTasksCount={tasks.length}
          recommendation={recommendation}
          hasAlternatives={recommendations.length > 1}
          busy={taskMutation.isPending}
          onComplete={requestComplete}
          onNextRecommendation={() => setRecommendationIndex((current) => current + 1)}
        />

        <DeferralsCard
          deferrals={deferrals}
          undoPending={undoMutation.isPending}
          undoError={undoMutation.isError ? (undoMutation.error as Error).message : null}
          onUndo={(deferralId) => undoMutation.mutate(deferralId)}
        />

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

      {researchPrompt ? (
        <ResearchCompleteSheet
          taskTitle={researchPrompt.title}
          completedCount={researchPrompt.completed_count}
          targetCount={researchPrompt.target_count}
          recordedNotes={researchNotes(researchPrompt)}
          saving={taskMutation.isPending}
          error={taskMutation.error?.message ?? null}
          onClose={() => setResearchPrompt(null)}
          onSearch={searchCompanyList}
          onConfirm={confirmResearch}
          onSkip={skipResearchNote}
        />
      ) : null}

      {portfolioPrompt ? (
        <PortfolioCompleteSheet
          taskTitle={portfolioPrompt.title}
          completedCount={portfolioPrompt.completed_count}
          targetCount={portfolioPrompt.target_count}
          saving={taskMutation.isPending}
          error={taskMutation.error?.message ?? null}
          onClose={() => setPortfolioPrompt(null)}
          onConfirm={confirmPortfolio}
        />
      ) : null}
    </SafeAreaView>
  );
}
