import { Pressable, Text, View } from 'react-native';
import { t } from '@/services/i18n';
import { INK, META, type BoardColumn } from './board';

// 밑줄 세그먼트 컨트롤: 태스크 바로 위
export function BoardSegmentControl({
  columns,
  activePage,
  onChange,
}: {
  columns: BoardColumn[];
  activePage: number;
  onChange: (index: number) => void;
}) {
  return (
    <View className="mt-6 flex-row px-5">
      {columns.map((column, index) => {
        const isActive = activePage === index;
        return (
          <Pressable
            key={column.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={t('home.viewTasks', { status: column.label })}
            onPress={() => onChange(index)}
            className="flex-1 items-center justify-end pb-3"
            style={{ borderBottomWidth: 3, borderBottomColor: isActive ? INK : 'transparent' }}>
            <View className="flex-row items-baseline">
              <Text className="text-[15px] font-bold" style={{ color: isActive ? INK : META }}>
                {column.label}
              </Text>
              <Text
                className="ml-1.5 text-[13px] font-bold"
                style={{ color: isActive ? INK : META }}>
                {column.tasks.length}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
