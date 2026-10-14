import { Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import type { getDashboard } from '@/services/api';
import { t } from '@/services/i18n';

export function Reflection({
  totalPoints,
  tasks,
  accent,
}: {
  totalPoints: number;
  tasks: Awaited<ReturnType<typeof getDashboard>>['tasks'];
  accent: string;
}) {
  return (
    <View className="px-5 pt-7">
      <Text className="text-[10px] font-bold tracking-[1.5px] text-[#7660CC]">
        WEEKLY REVIEW · UNLOCKED
      </Text>
      <Text className="mt-3 text-[29px] font-bold leading-9 tracking-tight text-[#2C2936]">
        {t('rewards.retro.headline')}
      </Text>
      <Text className="mt-3 text-sm text-[#77717E]">{t('rewards.retro.body')}</Text>
      <View className="mt-7 flex-row gap-2">
        <View className="flex-1 rounded-2xl bg-[#EFEAFF] p-4">
          <Text className="text-2xl font-bold text-[#493D7B]">{totalPoints}</Text>
          <Text className="mt-1 text-[11px] text-[#736A91]">{t('rewards.retro.totalPoints')}</Text>
        </View>
        <View className="flex-1 rounded-2xl bg-[#E9F2FF] p-4">
          <Text className="text-2xl font-bold text-[#3E6293]">
            {tasks.filter((task) => task.goal_completed).length}
          </Text>
          <Text className="mt-1 text-[11px] text-[#6B7E96]">
            {t('rewards.retro.completedGoals')}
          </Text>
        </View>
      </View>
      <Pressable
        onPress={() => router.push('/weekly-retro')}
        className="mt-8 flex-row items-center justify-between rounded-2xl px-5 py-4"
        style={{ backgroundColor: accent }}>
        <Text className="font-bold text-white">{t('rewards.retro.open')}</Text>
        <Text className="text-xl text-white">→</Text>
      </Pressable>
      <Text className="mt-3 text-center text-[10px] text-[#878D7D]">
        {t('rewards.retro.costHint')}
      </Text>
    </View>
  );
}
