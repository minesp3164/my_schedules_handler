import { useState } from 'react';
import { Modal, Pressable, Text, TextInput, View } from 'react-native';
import { t } from '@/services/i18n';
import { useTheme } from '@/services/theme';
import type { TaskTemplate } from '@/services/api';

type TaskComposerSheetProps = {
  visible: boolean;
  saving: boolean;
  task?: TaskTemplate | null;
  onClose: () => void;
  onSave: (input: { title: string; targetCount: number; kind: string; weekdays: number[] }) => void;
};
type CategoryOption = { key: string; kind: string; titleKey: string; customTitle?: boolean };
const categories: CategoryOption[] = [
  { key: 'focus', kind: 'focus', titleKey: 'tasks.categoryFocus' },
  { key: 'algorithm', kind: 'algorithm', titleKey: 'tasks.categoryAlgorithm' },
  { key: 'blog', kind: 'portfolio', titleKey: 'tasks.categoryBlog' },
  // 기업 리서치는 조사만 한 활동이라 별도 종류를 쓴다. 실제 지원(kind: application)과 섞이지 않는다.
  { key: 'research', kind: 'research', titleKey: 'tasks.categoryResearch' },
  { key: 'apply', kind: 'application', titleKey: 'tasks.categoryApplication' },
  // 정확한 정보가 필요한 할 일은 제목을 직접 적고 반복 없이 오늘에만 붙는다.
  { key: 'custom', kind: 'custom', titleKey: 'tasks.categoryCustom', customTitle: true },
];
const categoryPoints: Record<string, number> = {
  focus: 10,
  algorithm: 1,
  portfolio: 20,
  research: 10,
  application: 25,
  custom: 10,
};
const fixedPointCategories = new Set(['portfolio', 'application']);
// 반복 요일을 고르지 않고 오늘(추가한 날)에만 붙는 할 일 종류.
const todayOnlyKinds = new Set(['research', 'application', 'custom']);
const weekdays = [1, 2, 3, 4, 5, 6, 0];
const keyForKind = (kind: string) =>
  categories.find((option) => option.kind === kind)?.key ?? 'focus';
// 기기의 오늘 요일(0=일~6=토). Date#getDay는 0=일요일이라 앱 요일 표기와 그대로 맞는다.
const todayWeekday = () => new Date().getDay();

export function TaskComposerSheet({
  visible,
  saving,
  task,
  onClose,
  onSave,
}: TaskComposerSheetProps) {
  const [targetCount, setTargetCount] = useState(task?.target_count ?? 1);
  const [categoryKey, setCategoryKey] = useState(keyForKind(task?.kind ?? 'focus'));
  const [selectedWeekdays, setSelectedWeekdays] = useState<number[]>(task?.weekdays ?? weekdays);
  const [customTitle, setCustomTitle] = useState('');
  const { palette } = useTheme();
  const option = categories.find((item) => item.key === categoryKey) ?? categories[0];
  // 오늘 전용 종류는 반복 요일을 고를 수 없게 하고 오늘 하루에만 붙는다.
  const todayOnly = todayOnlyKinds.has(option.kind);
  const autoPoints =
    (categoryPoints[option.kind] ?? 0) * (fixedPointCategories.has(option.kind) ? 1 : targetCount);
  const trimmedTitle = customTitle.trim();
  const close = () => {
    setTargetCount(1);
    setCategoryKey('focus');
    setSelectedWeekdays(weekdays);
    setCustomTitle('');
    onClose();
  };
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      presentationStyle="overFullScreen"
      onRequestClose={close}>
      <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(23, 48, 82, 0.28)' }}>
        <Pressable
          accessibilityLabel={t('tasks.closeAddSheet')}
          onPress={close}
          style={{ position: 'absolute', inset: 0 }}
        />
        <View
          style={{
            backgroundColor: palette.surface,
            borderColor: palette.line,
            borderWidth: 1,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: 32,
          }}>
          <View className="h-1.5 w-10 self-center rounded-full bg-[#C8DDCF]" />
          <View className="mt-5 flex-row items-center justify-between">
            <Text className="text-xl font-bold text-[#26332D]">
              {t(task ? 'tasks.editSheetTitle' : 'tasks.sheetTitle')}
            </Text>
            <Pressable
              accessibilityLabel={t('tasks.closeAddSheet')}
              onPress={close}
              className="min-h-11 min-w-11 items-center justify-center">
              <Text className="text-sm font-semibold text-muted">{t('tasks.cancel')}</Text>
            </Pressable>
          </View>
          <Counter
            label={t('tasks.targetCount')}
            value={t('tasks.targetCountValue', { count: targetCount })}
            decrementLabel={t('tasks.decreaseTargetCount')}
            incrementLabel={t('tasks.increaseTargetCount')}
            disabled={targetCount === 1}
            onDecrease={() => setTargetCount((count) => Math.max(1, count - 1))}
            onIncrease={() => setTargetCount((count) => count + 1)}
          />
          <View className="mt-4 border-t border-line pt-4">
            <Text className="text-sm font-semibold text-[#26332D]">{t('tasks.category')}</Text>
            <View className="mt-3 flex-row flex-wrap gap-2">
              {categories.map((category) => {
                const selected = categoryKey === category.key;
                return (
                  <Pressable
                    key={category.key}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => setCategoryKey(category.key)}
                    className="rounded-full px-3 py-2"
                    style={{ backgroundColor: selected ? palette.accent : palette.accentSoft }}>
                    <Text
                      className="text-xs font-bold"
                      style={{ color: selected ? '#FFFFFF' : palette.accent }}>
                      {t(category.titleKey)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text className="mt-3 text-xs font-semibold text-muted">
              {t('tasks.autoPoints', { points: autoPoints })}
            </Text>
          </View>
          {option.customTitle ? (
            <View className="mt-4 border-t border-line pt-4">
              <Text className="text-sm font-semibold text-[#26332D]">
                {t('tasks.customTitleLabel')}
              </Text>
              <Text className="mt-1 text-xs text-muted">{t('tasks.customTitleHint')}</Text>
              <TextInput
                value={customTitle}
                onChangeText={setCustomTitle}
                placeholder={t('tasks.customCategoryPlaceholder')}
                placeholderTextColor="#AAB0B6"
                className="mt-3 h-11 rounded-xl border border-line px-3 text-sm text-[#26332D]"
              />
            </View>
          ) : null}
          <View className="mt-4 border-t border-line pt-4">
            {todayOnly ? (
              <>
                <Text className="text-sm font-semibold text-[#26332D]">{t('tasks.todayOnly')}</Text>
                <Text className="mt-1 text-xs text-muted">{t('tasks.todayOnlyHint')}</Text>
              </>
            ) : (
              <>
                <Text className="text-sm font-semibold text-[#26332D]">{t('tasks.weekdays')}</Text>
                <Text className="mt-1 text-xs text-muted">{t('tasks.weekdaysHint')}</Text>
                <View className="mt-3 flex-row justify-between gap-1">
                  {weekdays.map((weekday) => {
                    const selected = selectedWeekdays.includes(weekday);
                    return (
                      <Pressable
                        key={weekday}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        accessibilityLabel={t(`tasks.weekday${weekday}`)}
                        onPress={() =>
                          setSelectedWeekdays((current) =>
                            selected
                              ? current.filter((item) => item !== weekday)
                              : [...current, weekday].sort((left, right) => left - right)
                          )
                        }
                        className="h-10 min-w-10 items-center justify-center rounded-full px-2"
                        style={{ backgroundColor: selected ? palette.accent : palette.accentSoft }}>
                        <Text
                          className="text-xs font-bold"
                          style={{ color: selected ? '#FFFFFF' : palette.accent }}>
                          {t(`tasks.weekdayShort${weekday}`)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}
          </View>
          <Pressable
            disabled={
              (todayOnly ? option.customTitle && !trimmedTitle : selectedWeekdays.length === 0) ||
              saving
            }
            onPress={() =>
              onSave({
                title: option.customTitle ? trimmedTitle : t(option.titleKey),
                targetCount,
                kind: option.kind,
                // 오늘 전용 종류는 추가한 당일 요일에만 붙는다.
                weekdays: todayOnly ? [todayWeekday()] : selectedWeekdays,
              })
            }
            style={{ backgroundColor: palette.accent }}
            className="mt-6 h-14 items-center justify-center rounded-2xl bg-lavender disabled:opacity-40">
            <Text className="text-base font-bold text-white">
              {saving ? t('tasks.saving') : t(task ? 'tasks.saveEdit' : 'tasks.add')}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function Counter({
  label,
  value,
  decrementLabel,
  incrementLabel,
  disabled,
  bordered,
  onDecrease,
  onIncrease,
}: {
  label: string;
  value: string;
  decrementLabel: string;
  incrementLabel: string;
  disabled: boolean;
  bordered?: boolean;
  onDecrease: () => void;
  onIncrease: () => void;
}) {
  const { palette } = useTheme();
  return (
    <View
      className={`mt-${bordered ? '3 border-t border-line pt-4' : '4'} flex-row items-center justify-between`}>
      <Text className="text-sm font-semibold text-[#26332D]">{label}</Text>
      <View className="flex-row items-center">
        <Pressable
          accessibilityLabel={decrementLabel}
          disabled={disabled}
          onPress={onDecrease}
          className="h-11 w-11 items-center justify-center rounded-lg bg-[#EEF5FA] disabled:opacity-40">
          <Text className="text-xl font-bold text-[#52786B]">−</Text>
        </Pressable>
        <Text className="min-w-16 text-center text-sm font-bold text-[#26332D]">{value}</Text>
        <Pressable
          accessibilityLabel={incrementLabel}
          onPress={onIncrease}
          style={{ backgroundColor: palette.accent }}
          className="h-11 w-11 items-center justify-center rounded-lg bg-lavender">
          <Text className="text-xl font-bold text-white">+</Text>
        </Pressable>
      </View>
    </View>
  );
}
