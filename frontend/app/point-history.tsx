import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { getHistory, type HistoryDay } from '@/services/api';
import { getDeviceToken } from '@/services/device-token';
import { formatShortDate, t } from '@/services/i18n';
import { useTheme } from '@/services/theme';

const eventLabel = (eventType: HistoryDay['point_events'][number]['event_type']) =>
  t(`history.event.${eventType}`);

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
          accessibilityLabel={t('common.back')}
          className="min-h-11 justify-center self-start py-2">
          <Text className="text-sm font-bold" style={{ color: palette.accent }}>
            {t('points.backToRewards')}
          </Text>
        </Pressable>
        <Text className="mt-4 text-2xl font-bold tracking-tight text-[#24232A]">
          {t('points.title')}
        </Text>
        <Text className="mt-2 text-sm leading-5 text-[#6B6571]">{t('points.description')}</Text>

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
                          {eventLabel(event.event_type)}
                        </Text>
                        <Text className="mt-1 text-[11px] text-[#817A87]">
                          {reverted ? t('points.revertedCaption') : t('points.countedCaption')}
                        </Text>
                      </View>
                      <Text
                        className={`text-base font-bold ${reverted ? 'text-[#98929E]' : ''}`}
                        style={
                          !reverted ? { color: positive ? palette.accent : '#E85E4A' } : undefined
                        }>
                        {positive ? '+' : ''}
                        {event.points.toLocaleString()}
                        {t('points.pointUnit')}
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
              <Text className="text-base font-bold text-[#37323F]">{t('points.emptyTitle')}</Text>
              <Text className="mt-2 text-center text-xs leading-5 text-[#817A87]">
                {t('points.emptyDescription')}
              </Text>
            </View>
          ) : null}
          {history.isError ? (
            <Text className="text-sm text-[#E85E4A]">{t('points.loadError')}</Text>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
