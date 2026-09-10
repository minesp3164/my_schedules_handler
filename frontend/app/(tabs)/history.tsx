import { useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { getHistory } from '@/services/api';
import { getDeviceToken } from '@/services/device-token';
import { t } from '@/services/i18n';

const iso = (date: Date) => date.toISOString().slice(0, 10);

export default function History() {
  const [token, setToken] = useState<string | null>();
  useEffect(() => {
    getDeviceToken().then(setToken);
  }, []);
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 6);
  const history = useQuery({
    queryKey: ['history'],
    queryFn: () => getHistory(token!, iso(start), iso(end)),
    enabled: Boolean(token),
  });
  const days = history.data ?? [];
  const total = days.reduce((sum, day) => sum + day.summary.points_total, 0);
  return (
    <SafeAreaView className="flex-1 bg-screen">
      <ScrollView contentContainerClassName="px-5 pb-8 pt-8">
        <Text className="text-2xl font-bold text-[#173052]">{t('history.title')}</Text>
        <Text className="mt-2 text-sm text-muted">{t('history.description')}</Text>
        {!token ? (
          <Text className="mt-6 rounded-xl bg-surface p-4 text-muted">{t('history.connect')}</Text>
        ) : null}
        <View className="mt-6 flex-row gap-3">
          <View className="flex-1 rounded-2xl bg-surface p-4">
            <Text className="text-xs text-muted">{t('history.weeklyPoints')}</Text>
            <Text className="mt-1 text-2xl font-bold text-[#173052]">
              {t('common.point', { count: total })}
            </Text>
          </View>
          <View className="flex-1 rounded-2xl bg-surface p-4">
            <Text className="text-xs text-muted">{t('history.completedDays')}</Text>
            <Text className="mt-1 text-2xl font-bold text-[#173052]">
              {t('common.day', {
                count: days.filter((day) => day.summary.all_goals_completed_at).length,
              })}
            </Text>
          </View>
        </View>
        <View className="mt-5 rounded-2xl border border-line bg-surface p-4">
          <Text className="font-bold text-[#173052]">{t('history.dailyPoints')}</Text>
          <View className="mt-5 flex-row items-end justify-between gap-2">
            {days.map((day) => (
              <View key={day.date} className="flex-1 items-center">
                <View
                  className="w-full rounded-t-md bg-lavender"
                  style={{ height: Math.max(day.summary.points_total, 4) }}
                />
                <Text className="mt-2 text-xs text-muted">{day.date.slice(8)}</Text>
              </View>
            ))}
          </View>
        </View>
        {history.isError ? (
          <Text className="mt-4 text-sm text-[#FF9BA6]">{history.error.message}</Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
