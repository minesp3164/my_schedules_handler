import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createTaskTemplate,
  deactivateTaskTemplate,
  getTaskTemplates,
  type Dashboard,
} from '@/services/api';
import { getDeviceToken } from '@/services/device-token';
import { useRequireLogin } from '@/services/use-require-login';
import { t } from '@/services/i18n';

export default function TasksScreen() {
  const [token, setToken] = useState<string | null>();
  const requireLogin = useRequireLogin();
  const [title, setTitle] = useState('');
  const queryClient = useQueryClient();
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
        points: 10,
        target_count: 1,
        position: tasks.data?.length ?? 0,
        kind: 'custom',
      }),
    onSuccess: () => {
      setTitle('');
      queryClient.invalidateQueries({ queryKey: ['task-templates'] });
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
    <SafeAreaView className="flex-1 bg-screen">
      <ScrollView contentContainerClassName="px-5 pb-8 pt-6">
        <Pressable onPress={() => router.back()} className="min-h-11 justify-center">
          <Text className="text-sm text-lavender">{t('tasks.back')}</Text>
        </Pressable>
        <Text className="mt-3 text-2xl font-bold text-[#173052]">{t('tasks.title')}</Text>
        <Text className="mt-2 text-sm text-muted">{t('tasks.description')}</Text>
        {!token ? (
          <Text className="mt-6 rounded-xl bg-surface p-4 text-muted">{t('tasks.connect')}</Text>
        ) : null}
        <View className="mt-6 flex-row gap-2">
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder={t('tasks.placeholder')}
            placeholderTextColor="#69809D"
            className="flex-1 rounded-xl border border-line bg-surface px-4 py-3 text-[#173052]"
          />
          <Pressable
            disabled={!title || add.isPending}
            onPress={() => {
              if (!requireLogin(token)) return;
              add.mutate();
            }}
            className="min-w-16 items-center justify-center rounded-xl bg-lavender px-3 disabled:opacity-40">
            <Text className="font-bold text-white">{t('tasks.add')}</Text>
          </Pressable>
        </View>
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
                  if (!requireLogin(token)) return;
                  remove.mutate(task.id);
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
    </SafeAreaView>
  );
}
