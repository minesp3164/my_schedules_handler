import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import {
  createTaskTemplate,
  deactivateTaskTemplate,
  getTaskTemplates,
  type Dashboard,
} from '@/services/api';
import { getDeviceToken } from '@/services/device-token';
import { t } from '@/services/i18n';
import { useTheme } from '@/services/theme';

export default function TasksScreen() {
  const [token, setToken] = useState<string | null>();
  const [title, setTitle] = useState('');
  const [targetCount, setTargetCount] = useState(1);
  const [points, setPoints] = useState(10);
  const [isComposerVisible, setComposerVisible] = useState(false);
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
  const add = useMutation({
    mutationFn: () =>
      createTaskTemplate(token!, {
        title,
        points,
        target_count: targetCount,
        position: tasks.data?.length ?? 0,
        kind: 'custom',
      }),
    onSuccess: async ({ data: task }) => {
      setTitle('');
      setTargetCount(1);
      setPoints(10);
      setComposerVisible(false);
      queryClient.setQueryData<Dashboard>(['dashboard'], (current) =>
        current
          ? {
              ...current,
              tasks: [
                ...current.tasks,
                { ...task, completed_count: 0, goal_completed: false, completions: [] },
              ].sort((left, right) => left.position - right.position),
            }
          : current
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['task-templates'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      ]);
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => deactivateTaskTemplate(token!, id),
    onSuccess: async (_, id) => {
      queryClient.setQueryData<Dashboard>(['dashboard'], (current) =>
        current ? { ...current, tasks: current.tasks.filter((task) => task.id !== id) } : current
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['task-templates'] }),
        queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
      ]);
    },
  });
  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: palette.screen }}>
      <ScrollView contentContainerClassName="px-5 pb-8 pt-6">
        <Pressable onPress={() => router.back()} className="min-h-11 justify-center">
          <Text className="text-sm text-lavender">{t('tasks.back')}</Text>
        </Pressable>
        <Text className="mt-3 text-2xl font-bold text-[#173052]">{t('tasks.title')}</Text>
        <Text className="mt-2 text-sm text-muted">{t('tasks.description')}</Text>
        <Pressable
          onPress={() => setComposerVisible(true)}
          style={{ backgroundColor: palette.accent }}
          className="mt-6 h-12 items-center justify-center rounded-2xl bg-lavender transition duration-150 hover:-translate-y-px hover:opacity-90">
          <Text className="font-bold text-white">{t('tasks.openAddSheet')}</Text>
        </Pressable>
        <View className="mt-4 gap-3">
          {tasks.data?.map((task) => (
            <View
              key={task.id}
              className="min-h-16 flex-row items-center rounded-2xl border border-line bg-surface p-4">
              <View className="flex-1">
                <Text className="font-bold text-[#173052]">{task.title}</Text>
                <Text className="mt-1 text-sm text-muted">
                  {t('tasks.taskMeta', { points: task.points, count: task.target_count })}
                </Text>
              </View>
              <Pressable
                disabled={remove.isPending}
                onPress={() => {
                  if (token) remove.mutate(task.id);
                }}
                className="min-h-11 min-w-11 items-center justify-center">
                <Text className="text-sm text-[#FF9BA6]">{t('tasks.disable')}</Text>
              </Pressable>
            </View>
          ))}
        </View>
        {add.isError || remove.isError ? (
          <Text className="mt-4 text-sm text-[#FF9BA6]">{t('tasks.saveFailed')}</Text>
        ) : null}
      </ScrollView>
      <Modal
        visible={isComposerVisible}
        transparent
        animationType="none"
        presentationStyle="pageSheet"
        onRequestClose={() => setComposerVisible(false)}>
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <Animated.View entering={FadeIn.duration(180)} className="flex-1 justify-end bg-black/30">
            <Pressable
              accessibilityLabel={t('tasks.closeAddSheet')}
              className="flex-1"
              onPress={() => setComposerVisible(false)}
            />
            <Animated.View
              entering={SlideInDown.springify().damping(18).stiffness(190)}
              className="rounded-t-[28px] bg-surface px-5 pb-8 pt-3">
              <View className="h-1.5 w-10 self-center rounded-full bg-[#B8DBF7]" />
              <View className="mt-5 flex-row items-center justify-between">
                <Text className="text-xl font-bold text-[#173052]">{t('tasks.sheetTitle')}</Text>
                <Pressable
                  accessibilityLabel={t('tasks.closeAddSheet')}
                  onPress={() => setComposerVisible(false)}
                  className="min-h-11 min-w-11 items-center justify-center">
                  <Text className="text-sm font-semibold text-muted">{t('tasks.cancel')}</Text>
                </Pressable>
              </View>
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder={t('tasks.placeholder')}
                placeholderTextColor="#69809D"
                autoFocus
                className="mt-5 rounded-xl border border-line bg-screen px-4 py-4 text-[#173052]"
              />
              <View className="mt-4 flex-row items-center justify-between">
                <Text className="text-sm font-semibold text-[#173052]">
                  {t('tasks.targetCount')}
                </Text>
                <View className="flex-row items-center">
                  <Pressable
                    accessibilityLabel={t('tasks.decreaseTargetCount')}
                    disabled={targetCount === 1}
                    onPress={() => setTargetCount((count) => Math.max(1, count - 1))}
                    className="h-11 w-11 items-center justify-center rounded-lg bg-[#EEF5FA] disabled:opacity-40">
                    <Text className="text-xl font-bold text-[#2479CC]">−</Text>
                  </Pressable>
                  <Text className="min-w-16 text-center text-sm font-bold text-[#173052]">
                    {t('tasks.targetCountValue', { count: targetCount })}
                  </Text>
                  <Pressable
                    accessibilityLabel={t('tasks.increaseTargetCount')}
                    onPress={() => setTargetCount((count) => count + 1)}
                    style={{ backgroundColor: palette.accent }}
                    className="h-11 w-11 items-center justify-center rounded-lg bg-lavender">
                    <Text className="text-xl font-bold text-white">+</Text>
                  </Pressable>
                </View>
              </View>
              <View className="mt-3 flex-row items-center justify-between border-t border-line pt-4">
                <Text className="text-sm font-semibold text-[#173052]">{t('tasks.points')}</Text>
                <View className="flex-row items-center">
                  <Pressable
                    accessibilityLabel={t('tasks.decreasePoints')}
                    disabled={points === 0}
                    onPress={() => setPoints((value) => Math.max(0, value - 5))}
                    className="h-11 w-11 items-center justify-center rounded-lg bg-[#EEF5FA] disabled:opacity-40">
                    <Text className="text-xl font-bold text-[#2479CC]">−</Text>
                  </Pressable>
                  <Text className="min-w-16 text-center font-bold text-[#173052]">
                    {t('tasks.pointsValue', { points })}
                  </Text>
                  <Pressable
                    accessibilityLabel={t('tasks.increasePoints')}
                    onPress={() => setPoints((value) => value + 5)}
                    style={{ backgroundColor: palette.accent }}
                    className="h-11 w-11 items-center justify-center rounded-lg bg-lavender">
                    <Text className="text-xl font-bold text-white">+</Text>
                  </Pressable>
                </View>
              </View>
              <Pressable
                disabled={!title || add.isPending}
                onPress={() => {
                  if (token) add.mutate();
                }}
                style={{ backgroundColor: palette.accent }}
                className="mt-6 h-14 items-center justify-center rounded-2xl bg-lavender disabled:opacity-40">
                <Text className="text-base font-bold text-white">
                  {add.isPending ? t('tasks.saving') : t('tasks.add')}
                </Text>
              </Pressable>
            </Animated.View>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
