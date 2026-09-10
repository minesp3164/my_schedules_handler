import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, router } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  completeTask,
  createIdempotencyKey,
  getDashboard,
  revertCompletion,
  type Dashboard,
} from '@/services/api';
import { getDeviceToken } from '@/services/device-token';
import { useRequireLogin } from '@/services/use-require-login';
import { formatDate, t } from '@/services/i18n';

type DashboardTask = NonNullable<Dashboard['tasks']>[number];

export default function Home() {
  const [token, setToken] = useState<string | null | undefined>();
  const requireLogin = useRequireLogin();
  const queryClient = useQueryClient();
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
      const shouldRevert = task.completed_count >= task.target_count;
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
  const completed = tasks.filter((task) => task.goal_completed).length;
  const remaining = Math.max(100 - points, 0);
  return (
    <SafeAreaView className="flex-1 bg-screen">
      <ScrollView className="flex-1" contentContainerClassName="px-5 pb-8 pt-4">
        <View className="flex-row items-center justify-between">
          <View className="h-10 w-10 items-center justify-center rounded-[13px] bg-lavender">
            <Text className="text-xl text-white">✦</Text>
          </View>
          <Text className="text-[11px] font-bold tracking-[2px] text-[#31B9BD]">
            REWARD TRACKER
          </Text>
          <View className="h-10 w-10" />
        </View>
        <Text className="mt-9 text-sm text-muted">{formatDate(new Date())}</Text>
        <Text className="mt-1 text-[29px] font-bold leading-9 text-[#173052]">
          {t('home.greeting')}
        </Text>
        <Text className="mt-3 text-sm leading-6 text-muted">{t('home.description')}</Text>
        {!token ? (
          <Link href="/activate" asChild>
            <Pressable className="mt-6 rounded-xl border border-lavender bg-surface p-4 transition duration-150 hover:-translate-y-px hover:bg-[#EAF4FF]">
              <Text className="font-bold text-[#173052]">{t('home.connectTitle')}</Text>
              <Text className="mt-1 text-sm text-muted">{t('home.connectDescription')}</Text>
            </Pressable>
          </Link>
        ) : null}
        {dashboard.isError ? (
          <Text className="mt-4 text-sm text-[#FF9BA6]">{dashboard.error.message}</Text>
        ) : null}
        <View className="mt-6 rounded-[18px] border border-line bg-surface p-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-[17px] font-bold text-[#173052]">{t('home.tasks')}</Text>
            <Text className="rounded-full bg-[#DCEEFF] px-2.5 py-1 text-xs font-bold text-[#2479CC]">
              {t('home.completed', { completed, total: tasks.length })}
            </Text>
          </View>
          <View className="mt-3">
            {tasks.length === 0 && !dashboard.isLoading ? (
              <Text className="py-3 text-sm text-muted">{t('home.emptyTasks')}</Text>
            ) : null}
            {tasks.map((task, index) => (
              <View key={task.id} className={index > 0 ? 'border-t border-[#D8E7F5]' : ''}>
                <Pressable
                  disabled={taskMutation.isPending}
                  onPress={() => {
                    if (!requireLogin(token)) return;
                    taskMutation.mutate(task);
                  }}
                  className="min-h-12 flex-row items-center py-3 transition duration-150 hover:bg-[#F0F7FF] disabled:opacity-50">
                  <View
                    className={`h-6 w-6 items-center justify-center rounded-full border-2 ${task.goal_completed ? 'border-success bg-success' : 'border-lavender'}`}>
                    <Text className="text-xs text-white">{task.goal_completed ? '✓' : ''}</Text>
                  </View>
                  <View className="ml-3 flex-1">
                    <Text className="font-semibold text-[#173052]">{task.title}</Text>
                    <Text
                      className={`mt-0.5 text-xs ${task.goal_completed ? 'text-success' : 'text-muted'}`}>
                      {task.goal_completed
                        ? t('home.doneRevert')
                        : t('home.progress', {
                            completed: task.completed_count,
                            total: task.target_count,
                          })}
                    </Text>
                  </View>
                  <Text className="font-bold text-[#2479CC]">+{task.points}</Text>
                </Pressable>
              </View>
            ))}
          </View>
        </View>
        <View className="mt-5 rounded-[20px] border border-[#B8DBF7] bg-[#EAF4FF] p-5">
          <Text className="text-[17px] font-bold text-[#173052]">{t('home.reward')}</Text>
          <Text className="mt-1 text-sm text-muted">
            {t('home.remaining', { points: t('common.point', { count: remaining }) })}
          </Text>
          <View className="my-5 h-36 w-36 items-center justify-center self-center rounded-full border-[12px] border-lavender bg-surface">
            <Text className="text-3xl font-bold text-[#173052]">{Math.min(points, 100)}%</Text>
            <Text className="text-xs text-muted">
              {t('common.point', { count: points })} / {t('common.point', { count: 100 })}
            </Text>
          </View>
          <Pressable
            onPress={() => {
              if (!requireLogin(token)) return;
              router.push('/focus');
            }}
            className="items-center rounded-[14px] bg-lavender px-4 py-4 transition duration-150 hover:-translate-y-px hover:opacity-90">
            <Text className="font-bold text-white">{t('home.startFocus')}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
