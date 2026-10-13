import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { t } from '@/services/i18n';

type ApplicationsCardProps = {
  activeCount: number;
  recent: { id: string; company: string }[];
};

// 홈의 "진행 중인 지원" 한 줄 카드. 상세(단계 기록·종결)는 지원 현황 스택 화면이 맡는다.
export function ApplicationsCard({ activeCount, recent }: ApplicationsCardProps) {
  const empty = activeCount === 0;

  return (
    <Pressable
      onPress={() => router.push('/applications')}
      accessibilityRole="button"
      accessibilityLabel={t('applications.card.open')}
      className="mx-5 mt-5 rounded-3xl border border-hairline bg-white px-5 py-4">
      <View className="flex-row items-center justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-[11px] font-bold tracking-[1.5px] text-meta">
            {t('applications.card.label')}
          </Text>
          <Text className="mt-1.5 text-[15px] font-semibold leading-5 text-ink">
            {empty
              ? t('applications.card.empty')
              : t('applications.card.active', { count: activeCount })}
          </Text>
          {!empty && recent.length > 0 ? (
            <Text className="mt-0.5 text-xs text-meta" numberOfLines={1}>
              {t('applications.card.recent', {
                companies: recent.map((item) => item.company).join(', '),
              })}
            </Text>
          ) : null}
        </View>
        <Text className="text-sm font-bold text-[#8A9099]">›</Text>
      </View>
      {empty ? (
        <View className="mt-3 min-h-10 items-center justify-center rounded-2xl border border-hairline px-4">
          <Text className="text-xs font-bold text-ink">{t('applications.card.cta')}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}
