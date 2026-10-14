import { Pressable, ScrollView, Text } from 'react-native';
import type { BadgeCategory } from '@/services/api';
import { badgeCategories } from '@/services/badges';
import { useTheme } from '@/services/theme';

// 배지 분야 필터 칩 가로 스크롤 줄.
export function CategoryChips({
  category,
  onSelect,
}: {
  category: BadgeCategory | 'all';
  onSelect: (category: BadgeCategory | 'all') => void;
}) {
  const { palette } = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      className="mt-3"
      contentContainerClassName="gap-2 pb-1">
      {badgeCategories.map((option) => {
        const selected = category === option.key;
        return (
          <Pressable
            key={option.key}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
            onPress={() => onSelect(option.key)}
            className="rounded-full border px-[15px] py-2"
            style={{
              backgroundColor: selected ? palette.accentDeep : palette.surface,
              borderColor: selected ? palette.accentDeep : '#E4EAE3',
            }}>
            <Text
              className="text-[12.5px] font-bold"
              style={{ color: selected ? '#fff' : '#778078' }}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
