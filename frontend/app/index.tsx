import { Pressable, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { t } from '@/services/i18n';
import { useTheme } from '@/services/theme';

export default function LandingScreen() {
  const { palette } = useTheme();

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: palette.screen }}>
      <ScrollView contentContainerClassName="flex-grow px-5 pb-8 pt-4">
        <View className="flex-row items-center">
          <View
            className="h-11 w-11 items-center justify-center rounded-2xl bg-lavender"
            style={{ backgroundColor: palette.accent }}>
            <Text className="text-xl text-white">✦</Text>
          </View>
          <Text className="ml-3 text-[11px] font-bold tracking-[2px] text-[#2479CC]">
            {t('landing.brand')}
          </Text>
        </View>

        <View className="mt-12">
          <Text className="text-sm font-bold tracking-[1.5px] text-success">
            {t('landing.eyebrow')}
          </Text>
          <Text className="mt-4 text-[38px] font-bold leading-[46px] text-[#173052]">
            {t('landing.title')}
          </Text>
          <Text className="mt-5 text-base leading-7 text-muted">{t('landing.description')}</Text>
        </View>

        <View className="mt-10 rounded-[28px] border border-[#B8DBF7] bg-[#EAF4FF] p-6">
          <View className="h-12 w-12 items-center justify-center rounded-2xl bg-surface">
            <Text className="text-2xl">✓</Text>
          </View>
          <Text className="mt-5 text-xl font-bold text-[#173052]">{t('landing.cardTitle')}</Text>
          <Text className="mt-2 leading-6 text-muted">{t('landing.cardDescription')}</Text>
          <View className="mt-6 flex-row items-center justify-between rounded-2xl bg-surface px-4 py-3">
            <Text className="font-semibold text-[#173052]">{t('landing.reward')}</Text>
            <Text className="font-bold text-[#2479CC]">{t('landing.rewardPoints')}</Text>
          </View>
        </View>

        <View className="mt-8 gap-4">
          {['stepOne', 'stepTwo', 'stepThree'].map((step, index) => (
            <View key={step} className={`flex-row items-center ${index === 2 ? 'pb-[3px]' : ''}`}>
              <View className="h-7 w-7 items-center justify-center rounded-full bg-[#DCEEFF]">
                <Text className="text-xs font-bold text-[#2479CC]">{index + 1}</Text>
              </View>
              <Text className="ml-3 flex-1 text-sm text-muted">{t(`landing.${step}`)}</Text>
            </View>
          ))}
        </View>

        <Pressable
          onPress={() => router.replace('/(tabs)')}
          style={{ backgroundColor: palette.accent }}
          className="mt-2 min-h-14 items-center justify-center rounded-2xl bg-lavender px-5 py-4 transition duration-150 hover:-translate-y-px hover:opacity-90">
          <Text className="text-base font-bold text-white">{t('landing.start')}</Text>
        </Pressable>
        <Text className="mt-4 text-center text-xs leading-5 text-muted">{t('landing.note')}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
