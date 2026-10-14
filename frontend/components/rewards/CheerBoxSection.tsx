import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { t } from '@/services/i18n';
import { useTheme } from '@/services/theme';

const inboxCheers = [
  {
    id: 'new-cheer',
    label: 'NEW',
    date: t('rewards.cheer.inbox.newDate'),
    message: t('rewards.cheer.inbox.newMessage'),
    accent: '#E85E4A',
  },
  {
    id: 'saved-cheer',
    label: t('rewards.cheer.inbox.reread'),
    date: t('rewards.cheer.inbox.yesterdayDate'),
    message: t('rewards.cheer.inbox.savedMessage'),
    accent: '#9B7B60',
  },
];

// 응원함 탭 본문: 예시 읽지 않은 응원 카드와 안내.
export function CheerBoxSection() {
  const { palette } = useTheme();
  return (
    <View className="mt-5">
      <Text className="text-[10px] font-bold tracking-[1.5px]" style={{ color: palette.accent }}>
        KIND NOTES
      </Text>
      <Text className="mt-2 text-[23px] font-bold tracking-tight text-[#302B2F]">
        {t('rewards.tabCheerBox')}
      </Text>
      <Text className="mt-2 text-xs leading-5 text-[#7B7374]">{t('rewards.cheerBox.body')}</Text>
      <View className="mt-6 gap-3">
        {inboxCheers.map((cheer) => (
          <Pressable
            key={cheer.id}
            onPress={() =>
              router.push({
                pathname: '/rewards/[kind]',
                params: { kind: 'cheer', preview: cheer.id },
              })
            }
            accessibilityRole="button"
            accessibilityLabel={t('rewards.cheer.inbox.itemAccessibility', {
              label: cheer.label,
              message: cheer.message,
            })}
            className="rounded-3xl border p-5"
            style={{ backgroundColor: palette.accentSoft, borderColor: palette.line }}>
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <View
                  className="h-9 w-9 items-center justify-center rounded-xl"
                  style={{ backgroundColor: palette.surface }}>
                  <Text className="text-lg" style={{ color: palette.accent }}>
                    ✉
                  </Text>
                </View>
                <View className="ml-3">
                  <Text className="text-xs font-bold text-[#584B4C]">
                    {t('rewards.cheer.inbox.anonymous')}
                  </Text>
                  <Text className="mt-0.5 text-[10px] text-[#9A8D8E]">{cheer.date}</Text>
                </View>
              </View>
              <View
                className="rounded-full px-2.5 py-1"
                style={{ backgroundColor: `${cheer.accent}1A` }}>
                <Text className="text-[10px] font-bold" style={{ color: cheer.accent }}>
                  {cheer.label}
                </Text>
              </View>
            </View>
            <Text className="mt-5 text-[17px] font-bold leading-6 text-[#372E2F]">
              {cheer.message}
            </Text>
            <Text className="mt-4 text-xs font-bold" style={{ color: palette.accent }}>
              {t('rewards.cheer.inbox.open')}
            </Text>
          </Pressable>
        ))}
      </View>
      <View
        className="mt-5 flex-row rounded-2xl p-4"
        style={{ backgroundColor: palette.accentSoft }}>
        <Text className="mr-3 text-base" style={{ color: palette.accent }}>
          ⌁
        </Text>
        <Text className="flex-1 text-[11px] leading-5" style={{ color: palette.accentDeep }}>
          {t('rewards.cheerBox.notice')}
        </Text>
      </View>
    </View>
  );
}
