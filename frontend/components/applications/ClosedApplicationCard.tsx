import { Text, View } from 'react-native';
import { formatDate, t } from '@/services/i18n';
import type { Application } from '@/services/api';

// 마감된 지원 건 한 줄.
export function ClosedApplicationCard({ application }: { application: Application }) {
  return (
    <View className="flex-row items-center justify-between rounded-2xl border border-line bg-surface px-4 py-3.5">
      <View className="flex-1 pr-3">
        <Text className="text-sm font-semibold text-[#26332D]" numberOfLines={1}>
          {application.company}
        </Text>
        {application.closed_at ? (
          <Text className="mt-0.5 text-[11px] text-muted">
            {t('applications.closedOn', {
              date: formatDate(new Date(application.closed_at)),
            })}
          </Text>
        ) : null}
      </View>
      <Text className="text-[11px] font-bold text-muted">
        {t(`applications.status.${application.status}`)}
      </Text>
    </View>
  );
}
