import { Pressable, Text, View } from 'react-native';
import { t } from '@/services/i18n';
import { useTheme } from '@/services/theme';

export type RewardSection = 'rewards' | 'cheers';

// 해금/응원함 탭 전환 컨트롤.
export function SectionTabs({
  section,
  onChange,
}: {
  section: RewardSection;
  onChange: (section: RewardSection) => void;
}) {
  const { palette } = useTheme();
  return (
    <View className="mt-6 flex-row rounded-2xl p-1" style={{ backgroundColor: palette.accentSoft }}>
      <Pressable
        onPress={() => onChange('rewards')}
        accessibilityRole="tab"
        accessibilityState={{ selected: section === 'rewards' }}
        className={`min-h-11 flex-1 items-center justify-center rounded-xl ${section === 'rewards' ? 'bg-white' : ''}`}>
        <Text
          className="text-sm font-bold"
          style={{ color: section === 'rewards' ? palette.accent : '#8A8590' }}>
          {t('rewards.tabUnlocks')}
        </Text>
      </Pressable>
      <Pressable
        onPress={() => onChange('cheers')}
        accessibilityRole="tab"
        accessibilityState={{ selected: section === 'cheers' }}
        className={`min-h-11 flex-1 flex-row items-center justify-center rounded-xl ${section === 'cheers' ? 'bg-white' : ''}`}>
        <Text
          className="text-sm font-bold"
          style={{ color: section === 'cheers' ? palette.accent : '#8A8590' }}>
          {t('rewards.tabCheerBox')}
        </Text>
        <View className="ml-1.5 h-1.5 w-1.5 rounded-full bg-[#E85E4A]" />
      </Pressable>
    </View>
  );
}
