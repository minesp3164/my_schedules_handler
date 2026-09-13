import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  completeTask,
  createIdempotencyKey,
  getDashboard,
  revertCompletion,
  type Dashboard,
} from '@/services/api';
import { getDeviceToken } from '@/services/device-token';
import { formatDate, t } from '@/services/i18n';
import { useTheme } from '@/services/theme';

type DashboardTask = NonNullable<Dashboard['tasks']>[number];
type BoardStatus = 'todo' | 'doing' | 'done';

const boardColumns: {
  id: BoardStatus;
  labelKey: string;
  captionKey: string;
  accent: string;
}[] = [
  {
    id: 'todo',
    labelKey: 'home.board.todo.label',
    captionKey: 'home.board.todo.caption',
    accent: '#7C8CB5',
  },
  {
    id: 'doing',
    labelKey: 'home.board.doing.label',
    captionKey: 'home.board.doing.caption',
    accent: '#2479CC',
  },
  {
    id: 'done',
    labelKey: 'home.board.done.label',
    captionKey: 'home.board.done.caption',
    accent: '#31B9BD',
  },
];

function getTaskStatus(task: DashboardTask): BoardStatus {
  if (task.goal_completed) return 'done';
  if (task.completed_count > 0) return 'doing';
  return 'todo';
}

export default function Home() {
  const [token, setToken] = useState<string | null | undefined>();
  const [activePage, setActivePage] = useState(0);
  const { width } = useWindowDimensions();
  const queryClient = useQueryClient();
  const { palette } = useTheme();
  const pagerRef = useRef<ScrollView>(null);
  const [indicatorProgress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    getDeviceToken().then(setToken);
  }, []);

  const dashboard = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => getDashboard(token!),
    enabled: Boolean(token),
  });
  const taskMutation = useMutation({
    mutationFn: async (task: DashboardTask) => {
      if (!token) throw new Error(t('common.connectFirst'));
      const completion = task.completions.at(-1);
      const shouldRevert = task.goal_completed;
      return shouldRevert && completion
        ? Promise.all(
            task.completions.map((item) => revertCompletion(item.id, token, createIdempotencyKey()))
          )
        : completeTask(task.id, token, createIdempotencyKey());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
  });

  const tasks = dashboard.data?.tasks ?? [];
  const points = dashboard.data?.daily_summary.points_total ?? 0;
  const totalGoal = tasks.length;
  const doneCount = tasks.filter((task) => task.goal_completed).length;
  const completionRate = totalGoal ? Math.round((doneCount / totalGoal) * 100) : 0;
  const remaining = Math.max(100 - points, 0);
  const board = boardColumns.map((column) => ({
    ...column,
    label: t(column.labelKey),
    caption: t(column.captionKey),
    tasks: tasks.filter((task) => getTaskStatus(task) === column.id),
  }));

  const updatePage = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const pagePosition = event.nativeEvent.contentOffset.x / width;
    indicatorProgress.setValue(Math.max(0, Math.min(pagePosition, boardColumns.length - 1)));
    const nextPage = Math.round(pagePosition);
    const boundedPage = Math.max(0, Math.min(nextPage, boardColumns.length - 1));
    setActivePage((currentPage) => (currentPage === boundedPage ? currentPage : boundedPage));
  };

  const goToPage = (index: number) => {
    pagerRef.current?.scrollTo({ x: width * index, animated: true });
    Animated.timing(indicatorProgress, {
      toValue: index,
      duration: 220,
      useNativeDriver: true,
    }).start();
    setActivePage(index);
  };

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: palette.screen }}>
      <ScrollView className="flex-1" contentContainerClassName="pb-8">
        <View className="px-5 pt-4">
          <View className="flex-row items-center justify-between">
            <View className="h-11 w-11 items-center justify-center rounded-2xl bg-[#173052]">
              <Text className="text-lg text-white">▦</Text>
            </View>
            <View className="items-center">
              <Text className="text-[11px] font-bold tracking-[2px] text-[#2479CC]">
                {t('home.brand')}
              </Text>
              <Text className="mt-0.5 text-xs text-muted">{formatDate(new Date())}</Text>
            </View>
            <View className="h-11 w-11" />
          </View>

          <View className="mt-7 flex-row items-end justify-between">
            <View className="flex-1 pr-4">
              <Text className="text-[28px] font-bold leading-9 text-[#173052]">
                {t('home.title')}
              </Text>
              <Text className="mt-2 text-sm leading-5 text-muted">{t('home.description')}</Text>
            </View>
            <View className="h-[62px] w-[62px] items-center justify-center rounded-full border-[6px] border-[#DCEEFF] bg-[#EAF4FF]">
              <Text className="text-base font-bold text-[#2479CC]">{completionRate}%</Text>
              <Text className="text-[10px] font-semibold text-muted">
                {t('home.completionLabel')}
              </Text>
            </View>
          </View>

          <View className="mt-6 flex-row rounded-2xl bg-[#EAF4FF] p-1.5">
            {board.map((column, index) => (
              <Pressable
                key={column.id}
                accessibilityRole="tab"
                accessibilityState={{ selected: activePage === index }}
                accessibilityLabel={t('home.viewTasks', { status: column.label })}
                onPress={() => goToPage(index)}
                className={`flex-1 ${index ? 'ml-1' : ''}`}>
                <View
                  className={`items-center rounded-xl px-1 py-2 ${
                    activePage === index ? 'bg-surface' : ''
                  }`}>
                  <Text
                    className={`text-xs font-bold ${
                      activePage === index ? 'text-[#173052]' : 'text-muted'
                    }`}>
                    {column.label}
                  </Text>
                  <Text className="mt-0.5 text-[11px] text-muted">
                    {t('home.taskCount', { count: column.tasks.length })}
                  </Text>
                </View>
              </Pressable>
            ))}
          </View>
        </View>

        {dashboard.isError ? (
          <View className="mx-5 mt-4 rounded-xl border border-[#FFD3D8] bg-[#FFF4F5] px-4 py-3">
            <Text className="text-sm text-[#C44B5D]">{dashboard.error.message}</Text>
          </View>
        ) : null}

        <ScrollView
          ref={pagerRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={updatePage}
          onMomentumScrollEnd={updatePage}
          scrollEventThrottle={16}
          className="mt-5">
          {board.map((column) => (
            <View key={column.id} style={{ width }} className="px-5">
              <View className="overflow-hidden rounded-[22px] border border-line bg-surface">
                <View className="flex-row items-center justify-between border-b border-line bg-[#F9FCFF] px-5 py-4">
                  <View>
                    <View className="flex-row items-center">
                      <View
                        style={{ backgroundColor: column.accent }}
                        className="mr-2 h-2.5 w-2.5 rounded-full"
                      />
                      <Text className="text-[17px] font-bold text-[#173052]">{column.label}</Text>
                    </View>
                    <Text className="mt-1 text-xs text-muted">{column.caption}</Text>
                  </View>
                  <Text className="rounded-full bg-[#EAF4FF] px-2.5 py-1 text-xs font-bold text-[#2479CC]">
                    {t('home.taskCount', { count: column.tasks.length })}
                  </Text>
                </View>

                <View className="p-3">
                  {column.tasks.length === 0 && !dashboard.isLoading ? (
                    <View className="items-center px-4 py-9">
                      <Text className="text-2xl">{column.id === 'done' ? '✦' : '○'}</Text>
                      <Text className="mt-2 text-sm text-muted">
                        {column.id === 'done' ? t('home.emptyDone') : t('home.emptyColumn')}
                      </Text>
                    </View>
                  ) : null}

                  {dashboard.isLoading ? (
                    <View className="px-2 py-5">
                      <Text className="text-sm text-muted">{t('home.loading')}</Text>
                    </View>
                  ) : null}

                  {column.tasks.map((task, index) => {
                    const taskProgress = Math.min(
                      100,
                      Math.round((task.completed_count / task.target_count) * 100)
                    );
                    return (
                      <Pressable
                        key={task.id}
                        disabled={taskMutation.isPending}
                        onPress={() => taskMutation.mutate(task)}
                        accessibilityRole="button"
                        accessibilityLabel={t('home.taskAccessibility', {
                          title: task.title,
                          action: task.goal_completed
                            ? t('home.revertAction')
                            : t('home.completeAction'),
                        })}
                        className={`rounded-2xl border border-line bg-white p-4 disabled:opacity-50 ${
                          index ? 'mt-3' : ''
                        }`}>
                        <View className="flex-row items-start justify-between">
                          <View className="mr-3 flex-1">
                            <Text className="text-base font-bold leading-6 text-[#173052]">
                              {task.title}
                            </Text>
                            <Text className="mt-1.5 text-xs text-muted">
                              {task.goal_completed
                                ? t('home.goalCompleted')
                                : t('home.taskProgress', {
                                    completed: task.completed_count,
                                    total: task.target_count,
                                  })}
                            </Text>
                          </View>
                          <View
                            className={`h-7 min-w-7 items-center justify-center rounded-full px-1.5 ${
                              task.goal_completed ? 'bg-success' : 'bg-[#EAF4FF]'
                            }`}>
                            <Text
                              className={`text-xs font-bold ${
                                task.goal_completed ? 'text-white' : 'text-[#2479CC]'
                              }`}>
                              {task.goal_completed ? '✓' : `+${task.points}`}
                            </Text>
                          </View>
                        </View>
                        {!task.goal_completed ? (
                          <View className="mt-4 h-1.5 overflow-hidden rounded-full bg-[#EAF4FF]">
                            <View
                              style={{ width: `${taskProgress}%`, backgroundColor: column.accent }}
                              className="h-full rounded-full"
                            />
                          </View>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </View>
          ))}
        </ScrollView>

        <View className="mt-4 items-center">
          <View className="relative h-7 w-[54px] justify-center">
            {boardColumns.map((column, index) => (
              <Pressable
                key={column.id}
                accessibilityRole="button"
                accessibilityLabel={t('home.viewPage', { status: t(column.labelKey) })}
                onPress={() => goToPage(index)}
                style={{ left: index * 16 }}
                className="absolute h-7 w-[22px] items-center justify-center">
                <View className="h-1.5 w-1.5 rounded-full bg-[#C8D7E7]" />
              </Pressable>
            ))}
            <Animated.View
              pointerEvents="none"
              style={{
                position: 'absolute',
                top: 10.5,
                left: 0,
                zIndex: 1,
                height: 7,
                borderRadius: 999,
                backgroundColor: '#2479CC',
                width: indicatorProgress.interpolate({
                  inputRange: [0, 0.5, 1, 1.5, 2],
                  outputRange: [7, 22, 7, 22, 7],
                }),
                transform: [
                  {
                    translateX: indicatorProgress.interpolate({
                      inputRange: [0, 0.5, 1, 1.5, 2],
                      outputRange: [8, 0, 24, 16, 40],
                    }),
                  },
                ],
              }}
            />
          </View>
        </View>

        <View className="mx-5 mt-6 rounded-[20px] bg-[#173052] p-5">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-[17px] font-bold text-white">{t('home.paceTitle')}</Text>
              <Text className="mt-1 text-sm leading-5 text-[#B9CCE3]">
                {remaining > 0
                  ? t('home.remaining', { points: t('common.point', { count: remaining }) })
                  : t('home.rewardComplete')}
              </Text>
            </View>
            <Text className="text-2xl font-bold text-[#79CEFF]">
              {t('common.point', { count: points })}
            </Text>
          </View>
          <Pressable
            onPress={() => router.push('/focus')}
            style={{ backgroundColor: palette.accent }}
            className="mt-5 items-center rounded-xl bg-[#79CEFF] px-4 py-3.5">
            <Text className="font-bold text-[#173052]">{t('home.startFocus')}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
