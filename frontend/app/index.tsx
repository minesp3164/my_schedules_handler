import { useEffect, useState } from 'react';
import { Platform, Pressable, ScrollView, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { t } from '@/services/i18n';

// 랜딩은 첫 안내용이다. 한 번 보면 다음 실행부터는 홈으로 바로 들어간다.
const LANDING_SEEN_KEY = 'landing.seen.v1';

const readSeen = async () => {
  try {
    // 웹은 localStorage, 앱은 AsyncStorage. _layout의 저장소 감싸기와 같은 방식.
    if (Platform.OS === 'web') return window.localStorage.getItem(LANDING_SEEN_KEY);
    return await AsyncStorage.getItem(LANDING_SEEN_KEY);
  } catch {
    return null; // 저장소를 읽지 못하면 랜딩을 한 번 더 보여주는 편이 낫다.
  }
};

const markSeen = async () => {
  try {
    if (Platform.OS === 'web') window.localStorage.setItem(LANDING_SEEN_KEY, '1');
    else await AsyncStorage.setItem(LANDING_SEEN_KEY, '1');
  } catch {
    // 기록 실패는 무시한다. 다음 실행에 한 번 더 보여줄 뿐이다.
  }
};

export default function LandingScreen() {
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let mounted = true;
    void readSeen().then((seen) => {
      if (!mounted) return;
      if (seen === '1') {
        router.replace('/(tabs)');
        return;
      }
      setChecked(true);
    });
    return () => {
      mounted = false;
    };
  }, []);

  // 확인 전에는 화면이 깜빡이지 않도록 배경색만 보여준다.
  if (!checked) return <SafeAreaView className="flex-1 bg-[#F7F4EF]" />;

  return (
    <SafeAreaView className="flex-1 bg-[#F7F4EF]">
      <ScrollView contentContainerClassName="flex-grow px-5 pb-8 pt-4">
        <View className="flex-row items-center">
          <View className="h-11 w-11 items-center justify-center rounded-2xl bg-[#1F2A2E]">
            <Text className="text-xl text-white">✦</Text>
          </View>
          <Text className="ml-3 text-[11px] font-bold tracking-[2px] text-[#A24E2C]">
            {t('landing.brand')}
          </Text>
        </View>

        <View className="mt-12">
          <Text className="text-sm font-bold tracking-[1.5px] text-[#A24E2C]">
            {t('landing.eyebrow')}
          </Text>
          <Text className="mt-4 text-[38px] font-bold leading-[46px] text-[#1F2A2E]">
            {t('landing.title')}
          </Text>
          <Text className="mt-5 text-base leading-7 text-[#66716D]">
            {t('landing.description')}
          </Text>
        </View>

        <View className="mt-10 rounded-[28px] border border-[#C7CCC2] bg-[#E6E8E2] p-6">
          <View className="h-12 w-12 items-center justify-center rounded-2xl bg-surface">
            <Text className="text-2xl">✓</Text>
          </View>
          <Text className="mt-5 text-xl font-bold text-[#1F2A2E]">{t('landing.cardTitle')}</Text>
          <Text className="mt-2 leading-6 text-[#66716D]">{t('landing.cardDescription')}</Text>
          <View className="mt-6 flex-row items-center justify-between rounded-2xl bg-surface px-4 py-3">
            <Text className="font-semibold text-[#1F2A2E]">{t('landing.reward')}</Text>
            <Text className="font-bold text-[#A24E2C]">{t('landing.rewardPoints')}</Text>
          </View>
        </View>

        <View className="mt-8 gap-4">
          {['stepOne', 'stepTwo', 'stepThree'].map((step, index) => (
            <View key={step} className={`flex-row items-center ${index === 2 ? 'pb-[3px]' : ''}`}>
              <View className="h-7 w-7 items-center justify-center rounded-full bg-[#F0E1D8]">
                <Text className="text-xs font-bold text-[#A24E2C]">{index + 1}</Text>
              </View>
              <Text className="ml-3 flex-1 text-sm text-[#66716D]">{t(`landing.${step}`)}</Text>
            </View>
          ))}
        </View>

        <Pressable
          onPress={() => {
            void markSeen().then(() => router.replace('/(tabs)'));
          }}
          accessibilityRole="button"
          className="mt-8 min-h-14 items-center justify-center rounded-2xl bg-[#1F2A2E] px-5 py-4 transition duration-150 hover:-translate-y-px hover:opacity-90">
          <Text className="text-base font-bold text-white">{t('landing.start')}</Text>
        </Pressable>
        <Text className="mt-4 text-center text-xs leading-5 text-[#66716D]">
          {t('landing.note')}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
