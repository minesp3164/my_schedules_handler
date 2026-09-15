import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createTaskTemplate,
  deactivateTaskTemplate,
  getTaskTemplates,
  updateTaskTemplate,
  type Dashboard,
  type TaskTemplate,
} from '@/services/api';
import { getDeviceToken } from '@/services/device-token';
import { t } from '@/services/i18n';
import { useTheme } from '@/services/theme';
import { TaskComposerSheet } from '@/components/tasks/TaskComposerSheet';

type NewTask = {
  title: string;
  targetCount: number;
  kind: string;
  weekdays: number[];
};

const weekdayKeys = [1, 2, 3, 4, 5, 6, 0];
const sameWeekdays = (weekdays: number[], expected: number[]) =>
  weekdays.length === expected.length && expected.every((weekday) => weekdays.includes(weekday));

const scheduleLabel = (weekdays: number[]) => {
  if (weekdays.length === 7) return t('tasks.everyDay');
  if (sameWeekdays(weekdays, [1, 2, 3, 4, 5])) return t('tasks.weekdaysWeekdays');
  if (sameWeekdays(weekdays, [6, 0])) return t('tasks.weekends');

  return weekdayKeys
    .filter((weekday) => weekdays.includes(weekday))
    .map((weekday) => t(`tasks.weekdayShort${weekday}`))
    .join(' · ');
};

export default function TasksScreen() {
  const [token, setToken] = useState<string | null>();
  const [composerVisible, setComposerVisible] = useState(false);
  const [composerKey, setComposerKey] = useState(0);
  const [editingTask, setEditingTask] = useState<TaskTemplate | null>(null);
  const queryClient = useQueryClient();
  const { palette } = useTheme();
  useEffect(() => {
    getDeviceToken().then(setToken);
  }, []);
  const tasks = useQuery({
    queryKey: ['task-templates'],
    queryFn: () => getTaskTemplates(token!),
    enabled: Boolean(token),
  });
  const refreshTasks = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['task-templates'] }),
      queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
    ]);
  const add = useMutation({
    mutationFn: (input: NewTask) =>
      createTaskTemplate(token!, {
        title: input.title,
        target_count: input.targetCount,
        position: tasks.data?.length ?? 0,
        kind: input.kind,
        weekdays: input.weekdays,
      }),
    onSuccess: async ({ data: task }) => {
      setComposerVisible(false);
      setComposerKey((current) => current + 1);
      queryClient.setQueryData<Dashboard>(['dashboard'], (current) =>
        current
          ? {
              ...current,
              tasks: [
                ...current.tasks.filter((item) => item.id !== task.id),
                { ...task, completed_count: 0, goal_completed: false, completions: [] },
              ].sort((left, right) => left.position - right.position),
            }
          : current
      );
      await refreshTasks();
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => deactivateTaskTemplate(token!, id),
    onSuccess: async (_, id) => {
      queryClient.setQueryData<Dashboard>(['dashboard'], (current) =>
        current ? { ...current, tasks: current.tasks.filter((task) => task.id !== id) } : current
      );
      await refreshTasks();
    },
  });
  const update = useMutation({
    mutationFn: (input: NewTask) =>
      updateTaskTemplate(token!, editingTask!.id, {
        title: t(`tasks.category${input.kind.charAt(0).toUpperCase()}${input.kind.slice(1)}`),
        target_count: input.targetCount,
        position: editingTask!.position,
        kind: input.kind,
        weekdays: input.weekdays,
      }),
    onSuccess: async () => {
      setComposerVisible(false);
      setEditingTask(null);
      await refreshTasks();
    },
  });
  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: palette.screen }}>
      <ScrollView contentContainerClassName="px-5 pb-8 pt-6">
        <Pressable onPress={() => router.back()} className="min-h-11 justify-center">
          <Text className="text-sm" style={{ color: palette.accent }}>
            {t('tasks.back')}
          </Text>
        </Pressable>
        <Text className="mt-3 text-2xl font-bold text-[#26332D]">{t('tasks.title')}</Text>
        <Text className="mt-2 text-sm text-muted">{t('tasks.description')}</Text>
        <Pressable
          onPress={() => {
            setEditingTask(null);
            setComposerVisible(true);
          }}
          style={{ backgroundColor: palette.accent }}
          className="mt-6 h-12 items-center justify-center rounded-2xl bg-lavender transition duration-150 hover:-translate-y-px hover:opacity-90">
          <Text className="font-bold text-white">{t('tasks.openAddSheet')}</Text>
        </Pressable>
        <View className="mt-4 gap-3">
          {tasks.data?.map((task) => (
            <Pressable
              key={task.id}
              onPress={() => {
                setEditingTask(task);
                setComposerVisible(true);
              }}
              className="min-h-16 flex-row items-center rounded-2xl border border-line bg-surface p-4">
              <View className="flex-1">
                <Text className="font-bold text-[#26332D]">{task.title}</Text>
                <Text className="mt-1 text-sm text-muted">
                  {t('tasks.taskMeta', { points: task.points, count: task.target_count })}
                </Text>
                <Text className="mt-1 text-xs text-muted">{scheduleLabel(task.weekdays)}</Text>
              </View>
              <Pressable
                disabled={remove.isPending}
                onPress={() => token && remove.mutate(task.id)}
                className="min-h-11 min-w-11 items-center justify-center">
                <Text className="text-sm text-[#FF9BA6]">{t('tasks.disable')}</Text>
              </Pressable>
            </Pressable>
          ))}
        </View>
        {add.isError || update.isError || remove.isError ? (
          <Text className="mt-4 text-sm text-[#FF9BA6]">{t('tasks.saveFailed')}</Text>
        ) : null}
      </ScrollView>
      <TaskComposerSheet
        key={editingTask?.id ?? composerKey}
        visible={composerVisible}
        saving={add.isPending || update.isPending}
        task={editingTask}
        onClose={() => {
          setComposerVisible(false);
          setEditingTask(null);
        }}
        onSave={(input) => (editingTask ? update.mutate(input) : add.mutate(input))}
      />
    </SafeAreaView>
  );
}
